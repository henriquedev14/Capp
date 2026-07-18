import { prisma } from "@/infra/db/prisma/client";

// ---------------------------------------------------------------------------
// Fila priorizada de Contas a Receber — cliente, obra, vencimento, atraso.
// ---------------------------------------------------------------------------

export interface ItemReceberPriorizado {
  id: string;
  clienteNome: string;
  empreendimentoNome: string;
  empreendimentoId: string;
  valor: number;
  dataPrevista: Date | null;
  diasAtraso: number;
  /** [CORREÇÃO C2/C3.1] Empreendimento arquivado continua aparecendo aqui
   * (financeiro nunca esconde), só marcado pra UI poder exibir o badge. */
  empreendimentoArquivado: boolean;
}

export async function listarFilaContasAReceber(limite = 8): Promise<ItemReceberPriorizado[]> {
  const hoje = new Date();
  const contas = await prisma.contaReceber.findMany({
    where: { recebido: false, dataPrevista: { not: null } },
    include: {
      empreendimento: {
        select: {
          id: true,
          nome: true,
          excluidoEm: true,
          cliente: { select: { razaoSocial: true, nomeFantasia: true } },
        },
      },
    },
    orderBy: { dataPrevista: "asc" },
    take: limite * 3, // busca mais e filtra depois — algumas podem ter dataPrevista futura
  });

  return contas
    .map((c) => {
      const dias = c.dataPrevista ? Math.floor((hoje.getTime() - c.dataPrevista.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return {
        id: c.id,
        clienteNome: c.empreendimento.cliente.nomeFantasia || c.empreendimento.cliente.razaoSocial,
        empreendimentoNome: c.empreendimento.nome,
        empreendimentoId: c.empreendimento.id,
        valor: Number(c.valor),
        dataPrevista: c.dataPrevista,
        diasAtraso: Math.max(dias, 0),
        empreendimentoArquivado: c.empreendimento.excluidoEm != null,
      };
    })
    .sort((a, b) => b.diasAtraso - a.diasAtraso || (b.dataPrevista?.getTime() ?? 0) - (a.dataPrevista?.getTime() ?? 0))
    .slice(0, limite);
}

export interface TopCliente {
  clienteNome: string;
  valorEmAberto: number;
  quantidade: number;
}

export async function listarTopClientesDevedores(limite = 5): Promise<TopCliente[]> {
  const contas = await prisma.contaReceber.findMany({
    where: { recebido: false },
    include: { empreendimento: { select: { cliente: { select: { razaoSocial: true, nomeFantasia: true } } } } },
  });

  const mapa = new Map<string, { valor: number; qtd: number }>();
  for (const c of contas) {
    const nome = c.empreendimento.cliente.nomeFantasia || c.empreendimento.cliente.razaoSocial;
    const atual = mapa.get(nome) ?? { valor: 0, qtd: 0 };
    atual.valor += Number(c.valor);
    atual.qtd += 1;
    mapa.set(nome, atual);
  }

  return Array.from(mapa.entries())
    .map(([clienteNome, v]) => ({ clienteNome, valorEmAberto: v.valor, quantidade: v.qtd }))
    .sort((a, b) => b.valorEmAberto - a.valorEmAberto)
    .slice(0, limite);
}

// ---------------------------------------------------------------------------
// Fila priorizada de Contas a Pagar — fornecedor/descrição, vencimento.
// ---------------------------------------------------------------------------

export interface ItemPagarPriorizado {
  id: string;
  descricao: string;
  categoriaNome: string;
  empresaNome: string;
  valor: number;
  dataVencimento: Date;
  diasAtraso: number;
}

export async function listarFilaContasAPagar(limite = 8): Promise<ItemPagarPriorizado[]> {
  const hoje = new Date();
  const contas = await prisma.contaPagar.findMany({
    where: { pago: false },
    include: { categoria: { select: { nome: true } }, empresa: { select: { nome: true } } },
    orderBy: { dataVencimento: "asc" },
    take: limite,
  });

  return contas.map((c) => {
    const dias = Math.floor((hoje.getTime() - c.dataVencimento.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: c.id,
      descricao: c.descricao,
      categoriaNome: c.categoria.nome,
      empresaNome: c.empresa.nome,
      valor: Number(c.valor),
      dataVencimento: c.dataVencimento,
      diasAtraso: Math.max(dias, 0),
    };
  });
}

// ---------------------------------------------------------------------------
// Comparação entre Empresas do Grupo — saldo/resultado individual, pra
// não esconder problema de uma empresa atrás da média do grupo.
// ---------------------------------------------------------------------------

export interface ResultadoEmpresa {
  empresaId: string;
  empresaNome: string;
  recebidoMes: number;
  pagoMes: number;
  resultado: number;
  contasPagarVencidas: number;
}

export async function calcularResultadoPorEmpresa(): Promise<ResultadoEmpresa[]> {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

  const empresas = await prisma.empresaGrupo.findMany({ where: { ativo: true } });

  const resultado: ResultadoEmpresa[] = [];
  for (const empresa of empresas) {
    const [recebido, pago, vencidas] = await Promise.all([
      prisma.contaReceber.aggregate({
        where: { empresaId: empresa.id, recebido: true, recebidoEm: { gte: inicioMes, lt: fimMes } },
        _sum: { valor: true },
      }),
      prisma.contaPagar.aggregate({
        where: { empresaId: empresa.id, pago: true, pagoEm: { gte: inicioMes, lt: fimMes } },
        _sum: { valor: true },
      }),
      prisma.contaPagar.aggregate({
        where: { empresaId: empresa.id, pago: false, dataVencimento: { lt: hoje } },
        _sum: { valor: true },
      }),
    ]);

    const recebidoMes = Number(recebido._sum.valor ?? 0);
    const pagoMes = Number(pago._sum.valor ?? 0);
    resultado.push({
      empresaId: empresa.id,
      empresaNome: empresa.nome,
      recebidoMes,
      pagoMes,
      resultado: recebidoMes - pagoMes,
      contasPagarVencidas: Number(vencidas._sum.valor ?? 0),
    });
  }

  return resultado.sort((a, b) => b.resultado - a.resultado);
}

// ---------------------------------------------------------------------------
// Alertas financeiros — só exceções reais, com motivo e ação.
// ---------------------------------------------------------------------------

export interface AlertaFinanceiro {
  tipo: "CAIXA_NEGATIVO" | "CONTA_VENCIDA" | "EMPRESA_DEFICITARIA" | "CATEGORIA_NAO_CLASSIFICADA";
  titulo: string;
  detalhe: string;
  href?: string;
}

export async function gerarAlertasFinanceiros(): Promise<AlertaFinanceiro[]> {
  const alertas: AlertaFinanceiro[] = [];
  const hoje = new Date();

  const [contasPagarVencidas, contasReceberVencidas, empresas, categoriasNaoClassificadas] = await Promise.all([
    prisma.contaPagar.aggregate({ where: { pago: false, dataVencimento: { lt: hoje } }, _sum: { valor: true }, _count: true }),
    prisma.contaReceber.aggregate({
      where: { recebido: false, dataPrevista: { lt: hoje } },
      _sum: { valor: true },
      _count: true,
    }),
    calcularResultadoPorEmpresa(),
    prisma.categoriaDespesa.count({
      where: { OR: [{ comportamento: null }, { natureza: null }, { apropriacao: null }] },
    }),
  ]);

  if (contasPagarVencidas._count > 0) {
    alertas.push({
      tipo: "CONTA_VENCIDA",
      titulo: `${contasPagarVencidas._count} conta(s) a pagar vencida(s)`,
      detalhe: `Total de ${contasPagarVencidas._sum.valor?.toFixed(2) ?? 0} em atraso — verificar antes que gere juros/multa.`,
      href: "/financeiro/contas-a-pagar",
    });
  }
  if (contasReceberVencidas._count > 0) {
    alertas.push({
      tipo: "CONTA_VENCIDA",
      titulo: `${contasReceberVencidas._count} recebimento(s) atrasado(s)`,
      detalhe: `Total de ${contasReceberVencidas._sum.valor?.toFixed(2) ?? 0} vencido sem confirmação de recebimento.`,
      href: "/financeiro/contas-a-receber",
    });
  }
  for (const emp of empresas.filter((e) => e.resultado < 0)) {
    alertas.push({
      tipo: "EMPRESA_DEFICITARIA",
      titulo: `${emp.empresaNome} com resultado negativo no mês`,
      detalhe: `Recebeu ${emp.recebidoMes.toFixed(2)}, pagou ${emp.pagoMes.toFixed(2)} — déficit de ${Math.abs(emp.resultado).toFixed(2)}.`,
    });
  }
  if (categoriasNaoClassificadas > 0) {
    alertas.push({
      tipo: "CATEGORIA_NAO_CLASSIFICADA",
      titulo: `${categoriasNaoClassificadas} categoria(s) de despesa sem classificação`,
      detalhe: "Sem classificar Fixo/Variável, Custo/Despesa e Direto/Indireto, a Segmentação de Custos fica incompleta.",
      href: "/financeiro/categorias",
    });
  }

  return alertas;
}
