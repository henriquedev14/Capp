// Consultas agregadas para o Painel com visão por papel.
// Executadas em paralelo no server component para reduzir latência.
// Nenhuma delas depende do papel do usuário — a filtragem/apresentação é
// responsabilidade do componente client, que recebe todos os dados e
// mostra o subconjunto relevante para a aba ativa.

import { prisma } from "@/infra/db/prisma/client";

export interface DashboardData {
  // Empreendimentos com dados essenciais para todos os widgets
  empreendimentos: EmpreendimentoResumo[];
  // Orçamentos com status + totais + responsáveis
  orcamentos: OrcamentoResumo[];
  // Levantamentos por tipo — pra Engenharia
  levantamentos: {
    eletrico: LevantamentoResumo[];
    hidraulico: LevantamentoResumo[];
    materiais: LevantamentoResumo[];
  };
  // Alertas: orçamentos parados sem atualização há +7 dias
  paradosSemAtualizacao: OrcamentoResumo[];
  // Alertas: cotações enviadas há +5 dias sem resposta do fornecedor
  cotacoesSemResposta: {
    id: string;
    numero: string;
    fornecedorNome: string;
    empreendimentoId: string;
    empreendimentoNome: string;
    atualizadoEm: Date;
  }[];
  // Comparação com mês anterior (para setas de tendência)
  mes: {
    orcamentosAprovados: number;
    orcamentosAprovadosMesAnterior: number;
    valorAprovado: number;
    valorAprovadoMesAnterior: number;
    // "Fechado" = empreendimento realmente contratado (CONTRATADO+), não
    // apenas orçamento aprovado internamente pelo gestor. Ver FASES_FECHADAS.
    orcamentosFechados: number;
    orcamentosFechadosMesAnterior: number;
    valorFechado: number;
    valorFechadoMesAnterior: number;
  };
  // Foto do momento — não é uma métrica de mês. Soma dos orçamentos (última
  // revisão) de empreendimentos que estão EXATAMENTE em fase de Negociação.
  emNegociacao: {
    quantidade: number;
    valorTotal: number;
  };
  // Saúde financeira — puxado do módulo Financeiro (Fases 1-3), não do
  // Orçamento. "Recebido/Pago" é fluxo de caixa real (contas baixadas),
  // diferente de "valor fechado" (que é orçamento contratado, ainda pode
  // não ter sido recebido de verdade).
  financeiro: {
    recebidoMes: number;
    recebidoMesAnterior: number;
    pagoMes: number;
    pagoMesAnterior: number;
    saldoCaixaAtual: number;
    inadimplencia: { quantidade: number; valorTotal: number };
    contasPagarVencidas: { quantidade: number; valorTotal: number };
    contasPagarVencidasDetalhe: { descricao: string; valor: number; diasVencido: number }[];
    receitaPrevista: { mesLabel: string; valor: number; quantidade: number }[]; // próximos 6 meses
    lucroRealHistorico: { mesLabel: string; recebido: number; pago: number; lucro: number }[]; // últimos 6 meses
    custoFixoVsVariavel: { fixo: number; variavel: number }; // pago no mês, por tipo
  };
  // Produção/entrega — empreendimentos que já venceram a etapa comercial e
  // estão fisicamente sendo produzidos/entregues.
  producao: {
    emAndamento: { quantidade: number; valorTotal: number };
    lista: { empreendimentoId: string; empreendimentoNome: string; status: string; valor: number }[];
  };
  // KPIs cronológicos — quanto tempo cada etapa está levando de verdade,
  // por área. Usa os timestamps de conclusão (Comercial/Engenharia/
  // Orçamentação) e o histórico de mudança de status na Timeline (pra
  // Suprimentos/Produção, que não têm um campo de conclusão próprio).
  // `amostras` é sempre o nº de empreendimentos que entraram na média —
  // com poucas amostras, o número é mais "chute" que tendência real.
  kpisCronologicos: {
    engenharia: { tempoMedioDias: number | null; amostras: number };
    orcamentacao: { tempoMedioDias: number | null; mediaRevisoes: number | null; amostras: number };
    comercial: {
      tempoMedioProspeccaoDias: number | null;
      amostrasProspeccao: number;
      tempoMedioNegociacaoDias: number | null;
      amostrasNegociacao: number;
    };
    producao: {
      tempoMedioSuprimentosDias: number | null;
      tempoMedioProducaoDias: number | null;
      leadTimeTotalDias: number | null;
      amostras: number;
    };
  };
}

export interface EmpreendimentoResumo {
  id: string;
  nome: string;
  status: string;
  responsavelComercialUserId: string | null;
  responsavelEngenhariaUserId: string | null;
  responsavelOrcamentacaoUserId: string | null;
  clienteNome: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface OrcamentoResumo {
  id: string;
  empreendimentoId: string;
  empreendimentoNome: string;
  status: string;
  revisao: number;
  totalServicosHgi: number;
  totalMateriais: number;
  totalGeral: number;
  criadoPorId: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface LevantamentoResumo {
  id: string;
  empreendimentoId: string;
  empreendimentoNome: string;
  status: string;
  atualizadoEm: Date;
}

export async function carregarDashboardData(): Promise<DashboardData> {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const inicioMesAnterior = new Date(inicioMes);
  inicioMesAnterior.setMonth(inicioMesAnterior.getMonth() - 1);

  const setedeDiasAtras = new Date();
  setedeDiasAtras.setDate(setedeDiasAtras.getDate() - 7);

  const [empreendimentosRaw, orcamentosRaw, levEletricos, levHidraulicos, levMateriais] =
    await Promise.all([
      prisma.empreendimento.findMany({
        where: { excluidoEm: null },
        select: {
          id: true,
          nome: true,
          status: true,
          responsavelComercialUserId: true,
          responsavelEngenhariaUserId: true,
          responsavelOrcamentacaoUserId: true,
          comercialConcluidoEm: true,
          engenhariaConcluidaEm: true,
          orcamentacaoConcluidaEm: true,
          cliente: { select: { razaoSocial: true, nomeFantasia: true } },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.orcamento.findMany({
        where: { empreendimento: { excluidoEm: null } },
        select: {
          id: true,
          status: true,
          revisao: true,
          totalServicosHgi: true,
          totalMateriais: true,
          criadoPorId: true,
          createdAt: true,
          updatedAt: true,
          propostaGeradaEm: true,
          empreendimento: { select: { id: true, nome: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.levantamentoEletrico.findMany({
        where: { empreendimento: { excluidoEm: null } },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          empreendimento: { select: { id: true, nome: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.levantamentoHidraulico.findMany({
        where: { empreendimento: { excluidoEm: null } },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          empreendimento: { select: { id: true, nome: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.levantamentoMateriais.findMany({
        where: { empreendimento: { excluidoEm: null } },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          empreendimento: { select: { id: true, nome: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  const hoje = new Date();
  const [
    recebidoMesAgg,
    recebidoMesAnteriorAgg,
    pagoMesAgg,
    pagoMesAnteriorAgg,
    configuracao,
    contasReceberVencidasAgg,
    contasPagarVencidasAgg,
    receitaPrevistaRaw,
    contasPagarVencidasDetalheRaw,
  ] = await Promise.all([
    prisma.contaReceber.aggregate({
      where: { recebido: true, recebidoEm: { gte: inicioMes } },
      _sum: { valor: true },
    }),
    prisma.contaReceber.aggregate({
      where: { recebido: true, recebidoEm: { gte: inicioMesAnterior, lt: inicioMes } },
      _sum: { valor: true },
    }),
    prisma.contaPagar.aggregate({
      where: { pago: true, pagoEm: { gte: inicioMes } },
      _sum: { valor: true },
    }),
    prisma.contaPagar.aggregate({
      where: { pago: true, pagoEm: { gte: inicioMesAnterior, lt: inicioMes } },
      _sum: { valor: true },
    }),
    prisma.configuracaoSistema.findUnique({ where: { id: "default" } }),
    prisma.contaReceber.aggregate({
      where: { recebido: false, dataPrevista: { lt: hoje } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.contaPagar.aggregate({
      where: { pago: false, dataVencimento: { lt: hoje } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.contaReceber.findMany({
      where: { recebido: false, dataPrevista: { not: null, gte: hoje } },
      select: { dataPrevista: true, valor: true },
    }),
    prisma.contaPagar.findMany({
      where: { pago: false, dataVencimento: { lt: hoje } },
      select: { descricao: true, valor: true, dataVencimento: true },
      orderBy: { valor: "desc" },
      take: 8,
    }),
  ]);

  // Custo Fixo x Variável — usa o campo `tipo` que já existe em Conta a
  // Pagar como proxy: FIXA = custo fixo de verdade (aluguel, folha,
  // contabilidade — existe independente de volume de produção); AVULSA e
  // PARCELADA = custo variável (frete, material, comissão — atrelado a
  // obra/produção específica). Não é uma classificação contábil 100%
  // perfeita, mas usa o dado que já existe sem pedir recadastro de nada.
  //
  // Usa o VENCIMENTO do mês (não se já foi pago) — o objetivo aqui é
  // mostrar a ESTRUTURA de custo do mês (quanto é fixo vs variável),
  // não o fluxo de caixa (que já tem o card de Lucro Real pra isso). Se
  // usasse só "já pago", o gráfico ficaria vazio até alguém dar baixa
  // manual em cada conta, mesmo com as Contas Fixas já geradas.
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const custosDoMes = await prisma.contaPagar.findMany({
    where: { dataVencimento: { gte: inicioMes, lt: fimMes } },
    select: { tipo: true, valor: true },
  });
  const custoFixoVsVariavel = custosDoMes.reduce(
    (acc, c) => {
      if (c.tipo === "FIXA") acc.fixo += Number(c.valor);
      else acc.variavel += Number(c.valor);
      return acc;
    },
    { fixo: 0, variavel: 0 }
  );

  // Histórico de 6 meses pra trás — recebido/pago mês a mês, pra dar uma
  // tendência real em vez de só "esse mês vs mês passado".
  const seisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
  const [recebidosHistorico, pagosHistorico] = await Promise.all([
    prisma.contaReceber.findMany({
      where: { recebido: true, recebidoEm: { gte: seisMesesAtras } },
      select: { recebidoEm: true, valor: true },
    }),
    prisma.contaPagar.findMany({
      where: { pago: true, pagoEm: { gte: seisMesesAtras } },
      select: { pagoEm: true, valor: true },
    }),
  ]);

  // Agrupa a receita prevista (contas a receber ainda não recebidas, já
  // com data) por mês — só os próximos 6 meses, pra dar uma ideia de
  // faturamento vindo sem virar um gráfico ilegível de anos inteiros.
  // Também conta QUANTAS contas caem em cada mês — combinado com o valor,
  // dá pra ver se um mês "pesado" é por poucas contas grandes ou muitas
  // pequenas (duas escalas bem diferentes: R$ e quantidade).
  const receitaPorMes = new Map<string, number>();
  const qtdPorMes = new Map<string, number>();
  const nomesMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  for (let i = 0; i < 6; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    receitaPorMes.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
    qtdPorMes.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
  }
  for (const c of receitaPrevistaRaw) {
    if (!c.dataPrevista) continue;
    const chave = `${c.dataPrevista.getFullYear()}-${c.dataPrevista.getMonth()}`;
    if (receitaPorMes.has(chave)) {
      receitaPorMes.set(chave, (receitaPorMes.get(chave) ?? 0) + Number(c.valor));
      qtdPorMes.set(chave, (qtdPorMes.get(chave) ?? 0) + 1);
    }
  }
  const receitaPrevista = Array.from(receitaPorMes.entries()).map(([chave, valor]) => {
    const [ano, mes] = chave.split("-").map(Number);
    return { mesLabel: `${nomesMeses[mes ?? 0]}/${String(ano ?? 0).slice(2)}`, valor, quantidade: qtdPorMes.get(chave) ?? 0 };
  });

  // Histórico de 6 meses pra trás — mesma técnica de bucket por chave
  // "ano-mês", só que olhando pra trás em vez de pra frente.
  const historicoPorMes = new Map<string, { recebido: number; pago: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    historicoPorMes.set(`${d.getFullYear()}-${d.getMonth()}`, { recebido: 0, pago: 0 });
  }
  for (const c of recebidosHistorico) {
    if (!c.recebidoEm) continue;
    const chave = `${c.recebidoEm.getFullYear()}-${c.recebidoEm.getMonth()}`;
    const bucket = historicoPorMes.get(chave);
    if (bucket) bucket.recebido += Number(c.valor);
  }
  for (const c of pagosHistorico) {
    if (!c.pagoEm) continue;
    const chave = `${c.pagoEm.getFullYear()}-${c.pagoEm.getMonth()}`;
    const bucket = historicoPorMes.get(chave);
    if (bucket) bucket.pago += Number(c.valor);
  }
  const lucroRealHistorico = Array.from(historicoPorMes.entries()).map(([chave, v]) => {
    const [ano, mes] = chave.split("-").map(Number);
    return {
      mesLabel: `${nomesMeses[mes ?? 0]}/${String(ano ?? 0).slice(2)}`,
      recebido: v.recebido,
      pago: v.pago,
      lucro: v.recebido - v.pago,
    };
  });

  const empreendimentos: EmpreendimentoResumo[] = empreendimentosRaw.map((e) => ({
    id: e.id,
    nome: e.nome,
    status: e.status,
    responsavelComercialUserId: e.responsavelComercialUserId,
    responsavelEngenhariaUserId: e.responsavelEngenhariaUserId,
    responsavelOrcamentacaoUserId: e.responsavelOrcamentacaoUserId,
    clienteNome: e.cliente.nomeFantasia ?? e.cliente.razaoSocial,
    criadoEm: e.createdAt,
    atualizadoEm: e.updatedAt,
  }));

  const orcamentosTodos: OrcamentoResumo[] = orcamentosRaw.map((o) => {
    const totalServ = Number(o.totalServicosHgi ?? 0);
    const totalMat = Number(o.totalMateriais ?? 0);
    return {
      id: o.id,
      empreendimentoId: o.empreendimento.id,
      empreendimentoNome: o.empreendimento.nome,
      status: o.status,
      revisao: o.revisao,
      totalServicosHgi: totalServ,
      totalMateriais: totalMat,
      totalGeral: totalServ + totalMat,
      criadoPorId: o.criadoPorId,
      criadoEm: o.createdAt,
      atualizadoEm: o.updatedAt,
    };
  });

  // Regra de negócio: 1 empreendimento = 1 posição.
  // Cada empreendimento pode ter várias revisões de orçamento, mas o que
  // representa o "estado atual" é sempre a revisão mais recente (número
  // maior). A rev. anterior fica no histórico do empreendimento mas some
  // das visões agregadas — senão o mesmo empreendimento aparecia contando
  // várias vezes ("Devolvido na rev. 1 + Aprovado na rev. 2" = 1 deal só).
  const orcamentosPorEmp = new Map<string, OrcamentoResumo>();
  for (const o of orcamentosTodos) {
    const atual = orcamentosPorEmp.get(o.empreendimentoId);
    if (!atual || o.revisao > atual.revisao) {
      orcamentosPorEmp.set(o.empreendimentoId, o);
    }
  }
  const orcamentos: OrcamentoResumo[] = Array.from(orcamentosPorEmp.values());

  const mapLev = (arr: typeof levEletricos): LevantamentoResumo[] =>
    arr.map((l) => ({
      id: l.id,
      empreendimentoId: l.empreendimento.id,
      empreendimentoNome: l.empreendimento.nome,
      status: l.status,
      atualizadoEm: l.updatedAt,
    }));

  // Alertas: orçamentos ativos (não aprovados/arquivados) parados há +7 dias.
  const paradosSemAtualizacao = orcamentos.filter(
    (o) =>
      (o.status === "EM_LEVANTAMENTO" ||
        o.status === "ENVIADO_APROVACAO_GESTOR" ||
        o.status === "ORCAMENTO_DEVOLVIDO") &&
      o.atualizadoEm < setedeDiasAtras
  );

  // Alertas: cotações enviadas ao fornecedor há mais de 5 dias sem
  // resposta (nem aceita, nem recusada, nem respondida) — indica que
  // pode estar travando o fechamento do orçamento sem ninguém perceber.
  const cincoDiasAtras = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const cotacoesSemResposta = await prisma.cotacao.findMany({
    where: { status: "ENVIADA", updatedAt: { lt: cincoDiasAtras } },
    select: {
      id: true,
      numero: true,
      updatedAt: true,
      fornecedor: { select: { razaoSocial: true, nomeFantasia: true } },
      orcamento: { select: { empreendimentoId: true, empreendimento: { select: { nome: true } } } },
    },
    orderBy: { updatedAt: "asc" },
    take: 20,
  });

  // Comparação de mês: aprovações confirmadas por atualizadoEm dentro da janela.
  // Nota: essa heurística cai por terra se o orçamento passa por várias revisões
  // no mesmo mês. Como métrica-vitrine pra demo tá ok — se depois for pra usar
  // pra remuneração/bônus, migra pra uma tabela de eventos de mudança de status.
  const aprovadosMesAtual = orcamentos.filter(
    (o) => o.status === "ORCAMENTO_APROVADO" && o.atualizadoEm >= inicioMes
  );
  const aprovadosMesAnterior = orcamentos.filter(
    (o) =>
      o.status === "ORCAMENTO_APROVADO" &&
      o.atualizadoEm >= inicioMesAnterior &&
      o.atualizadoEm < inicioMes
  );

  // IMPORTANTE: "aprovado" (gestor aprovou o orçamento internamente) é
  // diferente de "fechado" (cliente contratou de fato — empreendimento
  // avançou pra CONTRATADO ou além). Antes esses dois conceitos estavam
  // misturados no dashboard, contando negócio ainda em Negociação como
  // "fechado". Separado explicitamente agora:
  const empreendimentosPorId = new Map(empreendimentos.map((e) => [e.id, e]));

  const fechadosMesAtual = orcamentos.filter((o) => {
    const emp = empreendimentosPorId.get(o.empreendimentoId);
    if (!emp) return false;
    const estaContratado = FASES_FECHADAS.has(emp.status);
    return estaContratado && emp.atualizadoEm >= inicioMes;
  });
  const fechadosMesAnterior = orcamentos.filter((o) => {
    const emp = empreendimentosPorId.get(o.empreendimentoId);
    if (!emp) return false;
    const estaContratado = FASES_FECHADAS.has(emp.status);
    return estaContratado && emp.atualizadoEm >= inicioMesAnterior && emp.atualizadoEm < inicioMes;
  });

  // Valor em negociação: soma dos orçamentos (última revisão) cujo
  // empreendimento está EXATAMENTE em Negociação agora. É uma "foto do
  // momento", não uma métrica de mês — por isso não tem comparação.
  const emNegociacao = orcamentos.filter((o) => {
    const emp = empreendimentosPorId.get(o.empreendimentoId);
    return emp?.status === "NEGOCIACAO";
  });

  // Produção/entrega: empreendimentos que já passaram da fase comercial e
  // estão fisicamente em Suprimentos ou Produção agora.
  const FASES_PRODUCAO = new Set(["SUPRIMENTOS", "PRODUCAO"]);
  const emProducao = orcamentos.filter((o) => {
    const emp = empreendimentosPorId.get(o.empreendimentoId);
    return emp ? FASES_PRODUCAO.has(emp.status) : false;
  });

  // KPIs cronológicos — tempo real de cada etapa, por área.
  //
  // Engenharia e Orçamentação usam os timestamps de conclusão de etapa
  // (ver responsabilidade-actions.ts) — dado limpo e direto.
  //
  // Comercial (negociação) e Produção não têm um campo de conclusão
  // próprio, então usamos a Timeline: procuramos o primeiro evento de
  // "MUDANCA_STATUS" que menciona cada status (seja pelo valor cru do
  // enum, tipo "NEGOCIACAO", seja pelo rótulo em português, tipo
  // "Negociação" — os vários pontos do sistema que geram esses eventos ao
  // longo da vida do projeto escreveram de jeitos um pouco diferentes).
  const diffDias = (inicio: Date, fim: Date) => (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
  const media = (valores: number[]) => (valores.length === 0 ? null : valores.reduce((s, v) => s + v, 0) / valores.length);

  // Engenharia: Comercial concluído → Engenharia concluída
  const temposEngenharia: number[] = [];
  for (const e of empreendimentosRaw) {
    if (e.comercialConcluidoEm && e.engenhariaConcluidaEm) {
      temposEngenharia.push(diffDias(e.comercialConcluidoEm, e.engenhariaConcluidaEm));
    }
  }

  // Orçamentação: Engenharia concluída → Orçamentação concluída
  const temposOrcamentacao: number[] = [];
  for (const e of empreendimentosRaw) {
    if (e.engenhariaConcluidaEm && e.orcamentacaoConcluidaEm) {
      temposOrcamentacao.push(diffDias(e.engenhariaConcluidaEm, e.orcamentacaoConcluidaEm));
    }
  }

  // Retrabalho de orçamento: média do nº de revisões por empreendimento
  // que já gerou proposta pelo menos uma vez (revisão 1 = normal, 3+ =
  // sinal de idas e vindas).
  const revisoesPorEmpreendimento = new Map<string, number>();
  for (const o of orcamentosRaw) {
    if (!o.propostaGeradaEm) continue;
    const empId = o.empreendimento.id;
    const atual = revisoesPorEmpreendimento.get(empId) ?? 0;
    if (o.revisao > atual) revisoesPorEmpreendimento.set(empId, o.revisao);
  }
  const mediaRevisoes = media(Array.from(revisoesPorEmpreendimento.values()));

  // Comercial (Prospecção): criação do empreendimento → Comercial concluído
  const temposProspeccao: number[] = [];
  for (const e of empreendimentosRaw) {
    if (e.comercialConcluidoEm) {
      temposProspeccao.push(diffDias(e.createdAt, e.comercialConcluidoEm));
    }
  }

  // Pra Negociação/Suprimentos/Produção, busca o histórico de status na
  // Timeline de cada empreendimento.
  const eventosStatus = await prisma.eventoEmpreendimento.findMany({
    where: { tipo: "MUDANCA_STATUS", empreendimento: { excluidoEm: null } },
    select: { empreendimentoId: true, titulo: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const eventosPorEmpreendimento = new Map<string, { titulo: string; createdAt: Date }[]>();
  for (const ev of eventosStatus) {
    const lista = eventosPorEmpreendimento.get(ev.empreendimentoId) ?? [];
    lista.push(ev);
    eventosPorEmpreendimento.set(ev.empreendimentoId, lista);
  }

  const TERMOS_STATUS: Record<string, string[]> = {
    NEGOCIACAO: ["negociacao"],
    CONTRATADO: ["contratado"],
    SUPRIMENTOS: ["suprimentos"],
    PRODUCAO: ["producao"],
    CONCLUIDO: ["concluido"],
  };
  function normalizarTexto(s: string): string {
    return s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  }
  function primeiraEntradaEm(empreendimentoId: string, status: keyof typeof TERMOS_STATUS): Date | null {
    const eventos = eventosPorEmpreendimento.get(empreendimentoId) ?? [];
    const termos = TERMOS_STATUS[status] ?? [];
    const achado = eventos.find((e) => termos.some((t) => normalizarTexto(e.titulo).includes(t)));
    return achado?.createdAt ?? null;
  }

  const temposNegociacao: number[] = [];
  const temposSuprimentos: number[] = [];
  const temposProducaoFase: number[] = [];
  const leadTimesTotais: number[] = [];
  for (const e of empreendimentosRaw) {
    const inicioNegociacao = primeiraEntradaEm(e.id, "NEGOCIACAO");
    const inicioContratado = primeiraEntradaEm(e.id, "CONTRATADO");
    if (inicioNegociacao && inicioContratado) {
      temposNegociacao.push(diffDias(inicioNegociacao, inicioContratado));
    }

    const inicioSuprimentos = primeiraEntradaEm(e.id, "SUPRIMENTOS");
    const inicioProducao = primeiraEntradaEm(e.id, "PRODUCAO");
    if (inicioSuprimentos && inicioProducao) {
      temposSuprimentos.push(diffDias(inicioSuprimentos, inicioProducao));
    }

    const inicioConcluido = primeiraEntradaEm(e.id, "CONCLUIDO");
    if (inicioProducao && inicioConcluido) {
      temposProducaoFase.push(diffDias(inicioProducao, inicioConcluido));
    }
    if (inicioContratado && inicioConcluido) {
      leadTimesTotais.push(diffDias(inicioContratado, inicioConcluido));
    }
  }

  const kpisCronologicos = {
    engenharia: { tempoMedioDias: media(temposEngenharia), amostras: temposEngenharia.length },
    orcamentacao: {
      tempoMedioDias: media(temposOrcamentacao),
      mediaRevisoes,
      amostras: temposOrcamentacao.length,
    },
    comercial: {
      tempoMedioProspeccaoDias: media(temposProspeccao),
      amostrasProspeccao: temposProspeccao.length,
      tempoMedioNegociacaoDias: media(temposNegociacao),
      amostrasNegociacao: temposNegociacao.length,
    },
    producao: {
      tempoMedioSuprimentosDias: media(temposSuprimentos),
      tempoMedioProducaoDias: media(temposProducaoFase),
      leadTimeTotalDias: media(leadTimesTotais),
      amostras: leadTimesTotais.length,
    },
  };

  return {
    empreendimentos,
    orcamentos,
    levantamentos: {
      eletrico: mapLev(levEletricos),
      hidraulico: mapLev(levHidraulicos),
      materiais: mapLev(levMateriais),
    },
    paradosSemAtualizacao,
    cotacoesSemResposta: cotacoesSemResposta.map((c) => ({
      id: c.id,
      numero: c.numero,
      fornecedorNome: c.fornecedor.nomeFantasia || c.fornecedor.razaoSocial,
      empreendimentoId: c.orcamento.empreendimentoId,
      empreendimentoNome: c.orcamento.empreendimento.nome,
      atualizadoEm: c.updatedAt,
    })),
    mes: {
      orcamentosAprovados: aprovadosMesAtual.length,
      orcamentosAprovadosMesAnterior: aprovadosMesAnterior.length,
      valorAprovado: aprovadosMesAtual.reduce((s, o) => s + o.totalGeral, 0),
      valorAprovadoMesAnterior: aprovadosMesAnterior.reduce((s, o) => s + o.totalGeral, 0),
      orcamentosFechados: fechadosMesAtual.length,
      orcamentosFechadosMesAnterior: fechadosMesAnterior.length,
      valorFechado: fechadosMesAtual.reduce((s, o) => s + o.totalGeral, 0),
      valorFechadoMesAnterior: fechadosMesAnterior.reduce((s, o) => s + o.totalGeral, 0),
    },
    emNegociacao: {
      quantidade: emNegociacao.length,
      valorTotal: emNegociacao.reduce((s, o) => s + o.totalGeral, 0),
    },
    financeiro: {
      recebidoMes: Number(recebidoMesAgg._sum.valor ?? 0),
      recebidoMesAnterior: Number(recebidoMesAnteriorAgg._sum.valor ?? 0),
      pagoMes: Number(pagoMesAgg._sum.valor ?? 0),
      pagoMesAnterior: Number(pagoMesAnteriorAgg._sum.valor ?? 0),
      saldoCaixaAtual: Number(configuracao?.saldoCaixaAtual ?? 0),
      inadimplencia: {
        quantidade: contasReceberVencidasAgg._count,
        valorTotal: Number(contasReceberVencidasAgg._sum.valor ?? 0),
      },
      contasPagarVencidas: {
        quantidade: contasPagarVencidasAgg._count,
        valorTotal: Number(contasPagarVencidasAgg._sum.valor ?? 0),
      },
      contasPagarVencidasDetalhe: contasPagarVencidasDetalheRaw.map((c) => ({
        descricao: c.descricao,
        valor: Number(c.valor),
        diasVencido: Math.floor((hoje.getTime() - c.dataVencimento.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      receitaPrevista,
      lucroRealHistorico,
      custoFixoVsVariavel,
    },
    producao: {
      emAndamento: {
        quantidade: emProducao.length,
        valorTotal: emProducao.reduce((s, o) => s + o.totalGeral, 0),
      },
      lista: emProducao.map((o) => {
        const emp = empreendimentosPorId.get(o.empreendimentoId);
        return {
          empreendimentoId: o.empreendimentoId,
          empreendimentoNome: emp?.nome ?? "—",
          status: emp?.status ?? "—",
          valor: o.totalGeral,
        };
      }),
    },
    kpisCronologicos,
  };
}

// Fases que representam negócio efetivamente fechado (cliente contratou).
// "Aprovado" (gestor aprovou o orçamento) não entra aqui — o negócio pode
// ainda cair na Negociação depois de aprovado internamente.
const FASES_FECHADAS = new Set(["CONTRATADO", "SUPRIMENTOS", "PRODUCAO", "CONCLUIDO"]);
