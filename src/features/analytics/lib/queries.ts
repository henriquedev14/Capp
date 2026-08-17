import { prisma } from "@/infra/db/prisma/client";
import { PERMISSOES } from "@/core/auth/permissions";
import { diasUteisEntre } from "@/core/analytics/calendario-operacional";
import {
  calcularComplexidadeEletrica,
  calcularComplexidadeHidraulica,
  calcularComplexidadeMateriais,
  nivelComplexidade,
} from "@/features/analytics/lib/complexidade-engenharia";
import type {
  AnalyticsData,
  EngenhariaPacoteAnalytics,
  EngenhariaPessoaAnalytics,
  RiscoAnalytics,
} from "@/features/analytics/lib/types";

const DIA_MS = 24 * 60 * 60 * 1000;

const LABEL_STATUS: Record<string, string> = {
  PROSPECCAO: "Prospecção",
  COMERCIAL: "Comercial / Engenharia",
  ORCAMENTACAO: "Orçamentação",
  NEGOCIACAO: "Negociação",
  CONTRATADO: "Contratado",
  SUPRIMENTOS: "Suprimentos",
  PRODUCAO: "Produção",
};

const ORDEM_PIPELINE = [
  "PROSPECCAO",
  "COMERCIAL",
  "ORCAMENTACAO",
  "NEGOCIACAO",
  "CONTRATADO",
  "SUPRIMENTOS",
  "PRODUCAO",
] as const;

function n(valor: unknown): number {
  if (valor == null) return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function arred(valor: number, casas = 1): number {
  const f = 10 ** casas;
  return Math.round(valor * f) / f;
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return arred(valores.reduce((s, v) => s + v, 0) / valores.length);
}

function diasCorridos(inicio: Date, fim = new Date()): number {
  return Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / DIA_MS));
}

function etapaEntrouEm(
  statusAtual: string,
  eventos: { meta: string | null; createdAt: Date }[],
  fallback: Date
): Date {
  for (let i = eventos.length - 1; i >= 0; i--) {
    const evento = eventos[i];
    if (!evento?.meta) continue;
    try {
      const meta = JSON.parse(evento.meta) as { statusNovo?: string };
      if (meta.statusNovo === statusAtual) return evento.createdAt;
    } catch {
      // timeline antiga pode conter texto livre; fallback é intencional.
    }
  }
  return fallback;
}

function severidadePorDias(dias: number, limite: number): "ALTA" | "MEDIA" | "BAIXA" {
  if (dias >= limite * 2) return "ALTA";
  if (dias >= limite) return "MEDIA";
  return "BAIXA";
}

export async function carregarAnalyticsData(): Promise<AnalyticsData> {
  const agora = new Date();
  const inicio30d = new Date(agora.getTime() - 30 * DIA_MS);
  const seteDiasAtras = new Date(agora.getTime() - 7 * DIA_MS);
  const cincoDiasAtras = new Date(agora.getTime() - 5 * DIA_MS);

  const [
    config,
    empreendimentos,
    orcamentos,
    contratos,
    interacoes,
    eletricos,
    hidraulicos,
    materiais,
    cotacoes,
    pedidos,
    marcos,
    ordens,
    pausas,
    registros30d,
    bancadas,
    remessas,
    contasReceber,
    kitsLegado,
    controlesEngenharia,
    eventosEngenharia30d,
    usuariosAtivos,
  ] = await Promise.all([
    prisma.configuracaoSistema.findUnique({ where: { id: "default" } }),
    prisma.empreendimento.findMany({
      where: { excluidoEm: null },
      select: {
        id: true,
        nome: true,
        status: true,
        origemLegado: true,
        legadoValorContratado: true,
        legadoFaturadoHistorico: true,
        legadoRecebidoHistorico: true,
        valorEstimado: true,
        tier: true,
        kitQdc: true,
        tipoEstrutura: true,
        metodoConstrutivo: true,
        tiposInstalacao: true,
        responsavelComercialUser: { select: { nome: true } },
        responsavelEngenhariaUser: { select: { nome: true } },
        responsavelOrcamentacaoUser: { select: { nome: true } },
        cliente: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        eventos: {
          where: { tipo: "MUDANCA_STATUS" },
          select: { meta: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.orcamento.findMany({
      where: { empreendimento: { excluidoEm: null, origemLegado: false } },
      select: {
        id: true,
        empreendimentoId: true,
        revisao: true,
        status: true,
        statusAprovacao: true,
        totalServicosHgi: true,
        totalMateriais: true,
        dataPrazo: true,
        enviadoAprovacaoEm: true,
        dataAprovacao: true,
        motivoDevolucao: true,
        responsavel: { select: { nome: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ empreendimentoId: "asc" }, { revisao: "desc" }],
    }),
    prisma.contrato.findMany({
      where: { empreendimento: { excluidoEm: null } },
      select: { empreendimentoId: true, valorFinal: true, geradoEm: true },
      orderBy: { geradoEm: "desc" },
    }),
    prisma.interacaoNegociacao.findMany({
      where: { empreendimento: { excluidoEm: null, origemLegado: false } },
      select: {
        id: true,
        empreendimentoId: true,
        tipo: true,
        valorNegociado: true,
        motivoPerda: true,
        proximaAcao: true,
        proximaAcaoData: true,
        registradoPor: { select: { nome: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.levantamentoEletrico.findMany({
      where: {
        empreendimento: { excluidoEm: null, origemLegado: false },
        tipologia: { tecnica: false },
        OR: [{ status: "RASCUNHO" }, { validadoEm: { gte: inicio30d } }],
      },
      select: {
        id: true,
        status: true,
        revisao: true,
        validadoEm: true,
        criadoPorId: true,
        criadoPor: { select: { nome: true } },
        validadoPor: { select: { nome: true } },
        createdAt: true,
        updatedAt: true,
        tipologia: { select: { nome: true, areaPrivativa: true, quantidadeUnidades: true } },
        empreendimento: {
          select: { id: true, nome: true, tier: true, kitQdc: true, tipoEstrutura: true, metodoConstrutivo: true, tiposInstalacao: true },
        },
        pecas: { select: { circuitos: { select: { circuito: true } } } },
      },
    }),
    prisma.levantamentoHidraulico.findMany({
      where: {
        empreendimento: { excluidoEm: null, origemLegado: false },
        tipologia: { tecnica: false },
        OR: [{ status: "RASCUNHO" }, { validadoEm: { gte: inicio30d } }],
      },
      select: {
        id: true,
        status: true,
        subtipo: true,
        validadoEm: true,
        criadoPorId: true,
        criadoPor: { select: { nome: true } },
        validadoPor: { select: { nome: true } },
        createdAt: true,
        updatedAt: true,
        tipologia: { select: { nome: true, areaPrivativa: true, quantidadeUnidades: true } },
        empreendimento: { select: { id: true, nome: true, tier: true, tipoEstrutura: true, metodoConstrutivo: true } },
        itens: { select: { descricao: true, categoria: true, diametro: true } },
      },
    }),
    prisma.levantamentoMateriais.findMany({
      where: {
        empreendimento: { excluidoEm: null, origemLegado: false },
        tipologia: { tecnica: false },
        OR: [{ status: "RASCUNHO" }, { validadoEm: { gte: inicio30d } }],
      },
      select: {
        id: true,
        status: true,
        validadoEm: true,
        criadoPorId: true,
        criadoPor: { select: { nome: true } },
        validadoPor: { select: { nome: true } },
        createdAt: true,
        updatedAt: true,
        tipologia: { select: { nome: true, areaPrivativa: true, quantidadeUnidades: true } },
        empreendimento: { select: { id: true, nome: true, tier: true } },
        itens: { select: { descricao: true, categoria: true } },
      },
    }),
    prisma.cotacao.findMany({
      where: { orcamento: { empreendimento: { excluidoEm: null } } },
      select: { id: true, status: true, totalGeral: true, updatedAt: true, orcamento: { select: { empreendimentoId: true } } },
    }),
    prisma.pedidoCompra.findMany({
      where: { empreendimento: { excluidoEm: null } },
      select: {
        id: true,
        numero: true,
        status: true,
        empreendimentoId: true,
        empreendimento: { select: { nome: true, origemLegado: true } },
        fornecedor: { select: { razaoSocial: true, nomeFantasia: true } },
        dataPrevistaEntrega: true,
        itens: { select: { quantidadePedida: true, quantidadeRecebida: true, precoUnitario: true } },
      },
    }),
    prisma.marcoOperacional.findMany({
      where: { empreendimento: { excluidoEm: null }, etapa: { in: ["MATERIAL_COMPLETO", "PRODUCAO_INICIADA"] } },
      select: { empreendimentoId: true, tipologiaId: true, etapa: true, ocorridoEm: true },
      orderBy: { ocorridoEm: "asc" },
    }),
    prisma.ordemProducao.findMany({
      where: { tipologia: { empreendimento: { excluidoEm: null } } },
      select: {
        id: true,
        status: true,
        prazo: true,
        quantidadeAlvo: true,
        quantidadeAprovada: true,
        quantidadeRetrabalho: true,
        quantidadePerda: true,
        tipologia: { select: { empreendimentoId: true, empreendimento: { select: { nome: true } } } },
        operadorAtual: { select: { nome: true } },
      },
    }),
    prisma.pausaOrdemProducao.findMany({
      where: { inicio: { gte: inicio30d } },
      select: { motivo: true, inicio: true, fim: true },
    }),
    prisma.registroProducao.findMany({
      where: { createdAt: { gte: inicio30d } },
      select: { quantidade: true, bancadaId: true },
    }),
    prisma.bancada.findMany({ select: { id: true, uhReferencia: true } }),
    prisma.remessa.findMany({
      where: { deletedAt: null, status: { not: "CANCELADA" }, empreendimento: { excluidoEm: null } },
      select: {
        id: true,
        numero: true,
        status: true,
        empreendimentoId: true,
        empreendimento: { select: { nome: true, origemLegado: true } },
        dataSaidaPrevista: true,
        dataEntregaPrevista: true,
        itens: {
          select: {
            tipoKit: true,
            quantidadePrevista: true,
            quantidadeSeparada: true,
            quantidadeConferida: true,
            quantidadeCarregada: true,
            quantidadeExpedida: true,
          },
        },
      },
    }),
    prisma.contaReceber.findMany({
      where: { OR: [{ empreendimentoId: null }, { empreendimento: { excluidoEm: null } }] },
      select: {
        id: true,
        empreendimentoId: true,
        nomeAvulso: true,
        valor: true,
        dataPrevista: true,
        recebido: true,
        recebidoEm: true,
        empreendimento: { select: { nome: true, origemLegado: true } },
      },
    }),
    prisma.kitLegado.findMany({
      where: { empreendimento: { excluidoEm: null } },
      select: {
        quantidadeContratada: true,
        quantidadeEntregueHistorico: true,
        quantidadeProduzidaHistorico: true,
        ordemProducao: { select: { quantidadeAprovada: true } },
      },
    }),
    prisma.engenhariaControle.findMany({
      select: {
        id: true, referenciaTipo: true, referenciaId: true, executorId: true, executor: { select: { nome: true } },
        prazo: true, bloqueadoEm: true, motivoBloqueio: true, minutosBloqueados: true, retrabalhos: true, instrumentadoEm: true,
      },
    }),
    prisma.engenhariaControleEvento.findMany({
      where: { ocorridoEm: { gte: inicio30d } },
      select: { controleId: true, tipo: true, ocorridoEm: true },
    }),
    prisma.usuario.findMany({
      where: {
        ativo: true,
        papeis: {
          some: {
            papel: {
              permissoes: { some: { permissao: { chave: PERMISSOES.RESPONSABILIDADE_ENGENHARIA } } },
            },
          },
        },
      },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const contratoPorEmp = new Map<string, number>();
  for (const c of contratos) if (!contratoPorEmp.has(c.empreendimentoId)) contratoPorEmp.set(c.empreendimentoId, n(c.valorFinal));

  const ultimoOrcPorEmp = new Map<string, (typeof orcamentos)[number]>();
  for (const o of orcamentos) if (!ultimoOrcPorEmp.has(o.empreendimentoId)) ultimoOrcPorEmp.set(o.empreendimentoId, o);

  const valorEmp = new Map<string, number>();
  for (const e of empreendimentos) {
    const valorOrcamento = n(ultimoOrcPorEmp.get(e.id)?.totalServicosHgi) + n(ultimoOrcPorEmp.get(e.id)?.totalMateriais);
    const valorNormal = contratoPorEmp.get(e.id) ?? (valorOrcamento > 0 ? valorOrcamento : n(e.valorEstimado));
    const valor = e.origemLegado ? n(e.legadoValorContratado) : valorNormal;
    valorEmp.set(e.id, valor);
  }

  const interacoesPorEmp = new Map<string, (typeof interacoes)>();
  for (const i of interacoes) {
    const arr = interacoesPorEmp.get(i.empreendimentoId) ?? [];
    arr.push(i);
    interacoesPorEmp.set(i.empreendimentoId, arr);
  }
  const valorNegociacaoAtualPorEmp = new Map<string, number>();
  for (const [empreendimentoId, its] of interacoesPorEmp) {
    const base = valorEmp.get(empreendimentoId) ?? 0;
    const ultimaComValor = [...its].reverse().find((i) => i.valorNegociado != null);
    valorNegociacaoAtualPorEmp.set(empreendimentoId, ultimaComValor ? n(ultimaComValor.valorNegociado) : base);
  }

  const ativos = empreendimentos.filter((e) => !["CONCLUIDO", "ARQUIVADO"].includes(e.status));
  const clientesAtivos = new Set(ativos.map((e) => e.cliente.id)).size;
  const valorCarteira = ativos.reduce((s, e) => s + (valorEmp.get(e.id) ?? 0), 0);
  const valorContratado = ativos
    .filter((e) => ["CONTRATADO", "SUPRIMENTOS", "PRODUCAO"].includes(e.status))
    .reduce((s, e) => s + (valorEmp.get(e.id) ?? 0), 0);
  // Financeiro inclui contratos/legados concluídos que continuam compondo o histórico
  // financeiro; ARQUIVADO é excluído do consolidado operacional por segurança.
  const empreendimentosFinanceiros = empreendimentos.filter(
    (e) => e.status !== "ARQUIVADO" && ["CONTRATADO", "SUPRIMENTOS", "PRODUCAO", "CONCLUIDO"].includes(e.status)
  );
  const valorContratadoFinanceiro = empreendimentosFinanceiros.reduce((s, e) => s + (valorEmp.get(e.id) ?? 0), 0);
  const valorEmProducao = ativos.filter((e) => e.status === "PRODUCAO").reduce((s, e) => s + (valorEmp.get(e.id) ?? 0), 0);

  const metaPorStatus: Record<string, number | null> = {
    PROSPECCAO: config?.metaDiasComercial ? n(config.metaDiasComercial) : null,
    COMERCIAL: config?.metaDiasEngenharia ? n(config.metaDiasEngenharia) : null,
    ORCAMENTACAO: config?.metaDiasOrcamentacao ? n(config.metaDiasOrcamentacao) : null,
    NEGOCIACAO: config?.metaDiasComercial ? n(config.metaDiasComercial) : null,
    CONTRATADO: null,
    SUPRIMENTOS: null,
    PRODUCAO: config?.metaDiasProducao ? n(config.metaDiasProducao) : null,
  };

  const pipeline = ORDEM_PIPELINE.map((status) => {
    const itens = ativos.filter((e) => e.status === status && (!e.origemLegado || status === "PRODUCAO"));
    const agings = itens.map((e) => diasUteisEntre(etapaEntrouEm(status, e.eventos, e.updatedAt), agora));
    const sla = metaPorStatus[status];
    return {
      status,
      label: LABEL_STATUS[status] ?? status,
      quantidade: itens.length,
      valor: itens.reduce((s, e) => s + (status === "NEGOCIACAO" ? (valorNegociacaoAtualPorEmp.get(e.id) ?? valorEmp.get(e.id) ?? 0) : (valorEmp.get(e.id) ?? 0)), 0),
      agingMedioDias: media(agings),
      foraSla: sla == null ? 0 : agings.filter((d) => d > sla).length,
    };
  });

  const abertasNeg = ativos.filter((e) => e.status === "NEGOCIACAO" && !e.origemLegado);
  let followupsVencidos = 0;
  let semInteracao7d = 0;
  const descontos: number[] = [];
  for (const e of abertasNeg) {
    const its = interacoesPorEmp.get(e.id) ?? [];
    const ultima = its.at(-1);
    if (!ultima || ultima.createdAt < seteDiasAtras) semInteracao7d++;
    if (ultima?.proximaAcaoData && ultima.proximaAcaoData < agora) followupsVencidos++;
    const valorOriginal = n(ultimoOrcPorEmp.get(e.id)?.totalServicosHgi) + n(ultimoOrcPorEmp.get(e.id)?.totalMateriais);
    const ultimoComValor = [...its].reverse().find((i) => i.valorNegociado != null);
    const valorAtual = ultimoComValor ? n(ultimoComValor.valorNegociado) : valorOriginal;
    if (valorOriginal > 0 && valorAtual >= 0 && valorAtual <= valorOriginal) descontos.push(((valorOriginal - valorAtual) / valorOriginal) * 100);
  }

  const terminalPorEmp = new Map<string, (typeof interacoes)[number]>();
  for (const i of interacoes) {
    if (i.createdAt >= inicio30d && ["GANHA", "PERDIDA"].includes(i.tipo)) terminalPorEmp.set(i.empreendimentoId, i);
  }
  const terminal30d = Array.from(terminalPorEmp.values());
  const ganhos30d = terminal30d.filter((i) => i.tipo === "GANHA");
  const perdidos30d = terminal30d.filter((i) => i.tipo === "PERDIDA");
  const valorInteracao = (i: (typeof interacoes)[number]) => n(i.valorNegociado) || n(ultimoOrcPorEmp.get(i.empreendimentoId)?.totalServicosHgi) + n(ultimoOrcPorEmp.get(i.empreendimentoId)?.totalMateriais);
  const motivosMap = new Map<string, { quantidade: number; valor: number }>();
  for (const i of perdidos30d) {
    const motivo = i.motivoPerda ?? "NÃO INFORMADO";
    const atual = motivosMap.get(motivo) ?? { quantidade: 0, valor: 0 };
    atual.quantidade++;
    atual.valor += valorInteracao(i);
    motivosMap.set(motivo, atual);
  }

  const metaEngenharia = config?.metaDiasEngenharia ? n(config.metaDiasEngenharia) : null;
  const controlesPorRef = new Map(controlesEngenharia.map((c) => [`${c.referenciaTipo}|${c.referenciaId}`, c] as const));
  const retrabalhos30dPorControle = new Map<string, number>();
  for (const ev of eventosEngenharia30d) {
    if (ev.tipo !== "RETRABALHO") continue;
    retrabalhos30dPorControle.set(ev.controleId, (retrabalhos30dPorControle.get(ev.controleId) ?? 0) + 1);
  }
  const horasBloqueadas = (controle: (typeof controlesEngenharia)[number] | undefined) => {
    if (!controle) return 0;
    const aberto = controle.bloqueadoEm ? Math.max(0, agora.getTime() - controle.bloqueadoEm.getTime()) / 60000 : 0;
    return arred((controle.minutosBloqueados + aberto) / 60);
  };
  const dentroDoPrazo = (fim: Date, criadoEm: Date, prazo: Date | null | undefined) => {
    if (prazo) return fim <= prazo;
    const lead = diasUteisEntre(criadoEm, fim);
    return metaEngenharia == null ? null : lead <= metaEngenharia;
  };
  const pacotes: EngenhariaPacoteAnalytics[] = [];
  for (const l of eletricos) {
    const todosCircuitos = l.pecas.flatMap((p) => p.circuitos);
    const complexidade = calcularComplexidadeEletrica({
      area: n(l.tipologia.areaPrivativa), unidades: l.tipologia.quantidadeUnidades, pecas: l.pecas.length,
      circuitos: todosCircuitos.length, circuitosUnicos: new Set(todosCircuitos.map((c) => c.circuito).filter((c) => c != null)).size,
      revisao: l.revisao, tier: l.empreendimento.tier, kitQdc: l.empreendimento.kitQdc,
      tipoEstrutura: l.empreendimento.tipoEstrutura, metodoConstrutivo: l.empreendimento.metodoConstrutivo,
      tiposInstalacao: l.empreendimento.tiposInstalacao,
    });
    const fim = l.validadoEm ?? agora;
    const lead = diasUteisEntre(l.createdAt, fim);
    const controle = controlesPorRef.get(`ELETRICA|${l.id}`);
    pacotes.push({
      id: l.id, empreendimentoId: l.empreendimento.id, empreendimentoNome: l.empreendimento.nome,
      tipologia: l.tipologia.nome, disciplina: "ELETRICA", escopo: "Levantamento elétrico",
      executorId: controle?.executorId ?? l.criadoPorId, executorNome: controle?.executor?.nome ?? l.criadoPor?.nome ?? "Não atribuído", validadorNome: l.validadoPor?.nome ?? null,
      status: l.status, complexidade, complexidadeNivel: nivelComplexidade(complexidade), criadoEm: l.createdAt,
      atualizadoEm: l.updatedAt, validadoEm: l.validadoEm, leadTimeDiasUteis: lead,
      dentroSla: dentroDoPrazo(fim, l.createdAt, controle?.prazo), prazo: controle?.prazo ?? null, bloqueado: Boolean(controle?.bloqueadoEm),
      motivoBloqueio: controle?.motivoBloqueio ?? null, bloqueadoHoras: horasBloqueadas(controle), retrabalhosObservados: controle?.retrabalhos ?? 0,
      instrumentadoEm: controle?.instrumentadoEm ?? null,
    });
  }
  for (const l of hidraulicos) {
    const complexidade = calcularComplexidadeHidraulica({
      area: n(l.tipologia.areaPrivativa), unidades: l.tipologia.quantidadeUnidades, itens: l.itens.length,
      variedadeItens: new Set(l.itens.map((i) => `${i.categoria ?? ""}|${i.descricao}|${i.diametro ?? ""}`)).size,
      subtipo: l.subtipo, tier: l.empreendimento.tier, tipoEstrutura: l.empreendimento.tipoEstrutura,
      metodoConstrutivo: l.empreendimento.metodoConstrutivo,
    });
    const fim = l.validadoEm ?? agora;
    const lead = diasUteisEntre(l.createdAt, fim);
    const controle = controlesPorRef.get(`HIDRAULICA|${l.id}`);
    pacotes.push({
      id: l.id, empreendimentoId: l.empreendimento.id, empreendimentoNome: l.empreendimento.nome,
      tipologia: l.tipologia.nome, disciplina: "HIDRAULICA", escopo: l.subtipo,
      executorId: controle?.executorId ?? l.criadoPorId, executorNome: controle?.executor?.nome ?? l.criadoPor?.nome ?? "Não atribuído", validadorNome: l.validadoPor?.nome ?? null,
      status: l.status, complexidade, complexidadeNivel: nivelComplexidade(complexidade), criadoEm: l.createdAt,
      atualizadoEm: l.updatedAt, validadoEm: l.validadoEm, leadTimeDiasUteis: lead,
      dentroSla: dentroDoPrazo(fim, l.createdAt, controle?.prazo), prazo: controle?.prazo ?? null, bloqueado: Boolean(controle?.bloqueadoEm),
      motivoBloqueio: controle?.motivoBloqueio ?? null, bloqueadoHoras: horasBloqueadas(controle), retrabalhosObservados: controle?.retrabalhos ?? 0,
      instrumentadoEm: controle?.instrumentadoEm ?? null,
    });
  }
  for (const l of materiais) {
    const complexidade = calcularComplexidadeMateriais({
      area: n(l.tipologia.areaPrivativa), unidades: l.tipologia.quantidadeUnidades, itens: l.itens.length,
      variedade: new Set(l.itens.map((i) => `${i.categoria ?? ""}|${i.descricao}`)).size, tier: l.empreendimento.tier,
    });
    const fim = l.validadoEm ?? agora;
    const lead = diasUteisEntre(l.createdAt, fim);
    const controle = controlesPorRef.get(`MATERIAIS|${l.id}`);
    pacotes.push({
      id: l.id, empreendimentoId: l.empreendimento.id, empreendimentoNome: l.empreendimento.nome,
      tipologia: l.tipologia.nome, disciplina: "MATERIAIS", escopo: "Materiais",
      executorId: controle?.executorId ?? l.criadoPorId, executorNome: controle?.executor?.nome ?? l.criadoPor?.nome ?? "Não atribuído", validadorNome: l.validadoPor?.nome ?? null,
      status: l.status, complexidade, complexidadeNivel: nivelComplexidade(complexidade), criadoEm: l.createdAt,
      atualizadoEm: l.updatedAt, validadoEm: l.validadoEm, leadTimeDiasUteis: lead,
      dentroSla: dentroDoPrazo(fim, l.createdAt, controle?.prazo), prazo: controle?.prazo ?? null, bloqueado: Boolean(controle?.bloqueadoEm),
      motivoBloqueio: controle?.motivoBloqueio ?? null, bloqueadoHoras: horasBloqueadas(controle), retrabalhosObservados: controle?.retrabalhos ?? 0,
      instrumentadoEm: controle?.instrumentadoEm ?? null,
    });
  }

  // Uma linha por PESSOA (não por pessoa×disciplina) — achado pelo
  // Henrique em 14/08/2026. Chave do Map muda de `executor|disciplina`
  // pra só `executor`; o detalhe por disciplina fica em `porDisciplina`
  // dentro de cada pessoa, pro drawer expandir sem poluir a tabela.
  const porPessoaMap = new Map<
    string,
    {
      usuarioId: string;
      nome: string;
      disciplinas: Set<"ELETRICA" | "HIDRAULICA" | "MATERIAIS">;
      porDisciplina: Map<string, { wip: number; backlogPontos: number; entreguePontos: number }>;
      wip: number;
      backlogPontos: number;
      entreguePontos: number;
      pacotesEntregues: number;
      retrabalhosObservados: number;
      bloqueadoHoras: number;
      pacotesBloqueados: number;
      leads: number[];
      prazos: boolean[];
      qualidades: boolean[];
    }
  >();
  for (const p of pacotes) {
    if (!p.executorId) continue;
    const atual = porPessoaMap.get(p.executorId) ?? {
      usuarioId: p.executorId,
      nome: p.executorNome,
      disciplinas: new Set<"ELETRICA" | "HIDRAULICA" | "MATERIAIS">(),
      porDisciplina: new Map<string, { wip: number; backlogPontos: number; entreguePontos: number }>(),
      wip: 0,
      backlogPontos: 0,
      entreguePontos: 0,
      pacotesEntregues: 0,
      retrabalhosObservados: 0,
      bloqueadoHoras: 0,
      pacotesBloqueados: 0,
      leads: [],
      prazos: [],
      qualidades: [],
    };

    atual.disciplinas.add(p.disciplina);
    const disc = atual.porDisciplina.get(p.disciplina) ?? { wip: 0, backlogPontos: 0, entreguePontos: 0 };

    atual.retrabalhosObservados += p.retrabalhosObservados;
    atual.bloqueadoHoras = (atual.bloqueadoHoras ?? 0) + p.bloqueadoHoras;
    if (p.bloqueado) atual.pacotesBloqueados++;

    if (p.status === "VALIDADO" && p.validadoEm && p.validadoEm >= inicio30d) {
      atual.entreguePontos += p.complexidade;
      atual.pacotesEntregues++;
      disc.entreguePontos += p.complexidade;
      atual.leads.push(p.leadTimeDiasUteis);
      if (p.dentroSla != null) atual.prazos.push(p.dentroSla);
      // Qualidade só entra na amostra quando a validação ocorreu depois da
      // instrumentação. Retrabalho anterior à migration não é inferido.
      if (p.instrumentadoEm && p.validadoEm >= p.instrumentadoEm) {
        atual.qualidades.push(p.retrabalhosObservados === 0);
      }
    } else if (p.status !== "VALIDADO") {
      atual.wip++;
      atual.backlogPontos += p.complexidade;
      disc.wip++;
      disc.backlogPontos += p.complexidade;
    }
    atual.porDisciplina.set(p.disciplina, disc);
    porPessoaMap.set(p.executorId, atual);
  }

  const porPessoa = Array.from(porPessoaMap.values())
    .map(({ leads, prazos, qualidades, disciplinas, porDisciplina, ...p }) => ({
      ...p,
      disciplinas: Array.from(disciplinas),
      porDisciplina: Array.from(porDisciplina.entries()).map(([disciplina, v]) => ({
        disciplina: disciplina as "ELETRICA" | "HIDRAULICA" | "MATERIAIS",
        wip: v.wip,
        backlogPontos: Math.round(v.backlogPontos),
        entreguePontos: Math.round(v.entreguePontos),
      })),
      leadTimeMedioDias: media(leads),
      noPrazoPct: prazos.length ? arred((prazos.filter(Boolean).length / prazos.length) * 100) : null,
      qualidadePct: qualidades.length ? arred((qualidades.filter(Boolean).length / qualidades.length) * 100) : null,
      qualidadeAmostras: qualidades.length,
      qualidadeConfiabilidade: qualidades.length >= 10 ? ("CONFIAVEL" as const) : qualidades.length > 0 ? ("APROXIMADA" as const) : ("INDISPONIVEL" as const),
      entreguePontos: Math.round(p.entreguePontos),
      backlogPontos: Math.round(p.backlogPontos),
      bloqueadoHoras: arred(p.bloqueadoHoras ?? 0),
    }))
    .sort((a, b) => b.entreguePontos - a.entreguePontos || b.backlogPontos - a.backlogPontos);

  const backlogEng = pacotes.filter((p) => p.status !== "VALIDADO");
  const validados30 = pacotes.filter((p) => p.status === "VALIDADO" && p.validadoEm && p.validadoEm >= inicio30d);
  const foraSlaEng = backlogEng.filter((p) => p.dentroSla === false).length;
  const leadEng = validados30.map((p) => p.leadTimeDiasUteis);
  const qualidadeAmostra = validados30.filter((p) => p.instrumentadoEm && p.validadoEm && p.validadoEm >= p.instrumentadoEm);
  const firstPassYieldPct = qualidadeAmostra.length
    ? arred((qualidadeAmostra.filter((p) => p.retrabalhosObservados === 0).length / qualidadeAmostra.length) * 100)
    : null;

  const disciplinas = ["ELETRICA", "HIDRAULICA", "MATERIAIS"] as const;
  const capacidadePorDisciplina = disciplinas.map((disciplina) => {
    const entregues = validados30.filter((p) => p.disciplina === disciplina);
    const backlog = backlogEng.filter((p) => p.disciplina === disciplina);
    const capacidade = Math.round(entregues.reduce((sum, p) => sum + p.complexidade, 0));
    const demanda = Math.round(backlog.reduce((sum, p) => sum + p.complexidade, 0));
    return {
      disciplina,
      capacidadeObservada30dPontos: capacidade,
      backlogAtualPontos: demanda,
      // Não chamamos isso de "capacidade futura": é apenas quantos meses
      // do ritmo observado nos últimos 30 dias o backlog atual representa.
      coberturaBacklogMeses: capacidade > 0 ? arred(demanda / capacidade, 2) : null,
      pacotesEntregues30d: entregues.length,
    };
  });

  const aguardandoGestor = orcamentos.filter((o) => o.status === "ENVIADO_APROVACAO_GESTOR");
  const filaGestorDias = aguardandoGestor.map((o) => diasUteisEntre(o.enviadoAprovacaoEm ?? o.updatedAt, agora));
  const devolvidos30 = orcamentos.filter((o) => o.status === "ORCAMENTO_DEVOLVIDO" && o.updatedAt >= inicio30d).length;
  const aprovados30 = orcamentos.filter((o) => o.status === "ORCAMENTO_APROVADO" && (o.dataAprovacao ?? o.updatedAt) >= inicio30d).length;

  const cotacoesSemResposta = cotacoes.filter((c) => c.status === "ENVIADA" && c.updatedAt < cincoDiasAtras).length;
  const pedidosAbertos = pedidos.filter((p) => !["ENTREGUE_COMPLETO", "CANCELADO"].includes(p.status));
  const pedidosAtrasados = pedidosAbertos.filter((p) => p.dataPrevistaEntrega && p.dataPrevistaEntrega < agora);
  const valorPedidosAbertos = pedidosAbertos.reduce((s, p) => s + p.itens.reduce((si, i) => si + n(i.quantidadePedida) * n(i.precoUnitario), 0), 0);
  const itensPendentesRecebimento = pedidosAbertos.reduce((s, p) => s + p.itens.filter((i) => n(i.quantidadeRecebida) < n(i.quantidadePedida)).length, 0);

  const marcoProdPorChave = new Map<string, Date>();
  for (const m of marcos) if (m.etapa === "PRODUCAO_INICIADA" && m.tipologiaId) marcoProdPorChave.set(`${m.empreendimentoId}|${m.tipologiaId}`, m.ocorridoEm);
  const diasMaterialProducao: number[] = [];
  for (const m of marcos) {
    if (m.etapa !== "MATERIAL_COMPLETO" || !m.tipologiaId) continue;
    const fim = marcoProdPorChave.get(`${m.empreendimentoId}|${m.tipologiaId}`);
    if (fim) diasMaterialProducao.push(diasUteisEntre(m.ocorridoEm, fim));
  }

  const ordensAtrasadas = ordens.filter((o) => o.prazo && o.prazo < agora && o.status !== "CONCLUIDA");
  const retrabalho = ordens.reduce((s, o) => s + o.quantidadeRetrabalho, 0);
  const perdas = ordens.reduce((s, o) => s + o.quantidadePerda, 0);
  const pausaMap = new Map<string, number>();
  let tempoParadoHoras = 0;
  for (const p of pausas) {
    const inicio = p.inicio < inicio30d ? inicio30d : p.inicio;
    const fim = p.fim && p.fim < agora ? p.fim : agora;
    const horas = Math.max(0, (fim.getTime() - inicio.getTime()) / (60 * 60 * 1000));
    tempoParadoHoras += horas;
    pausaMap.set(p.motivo, (pausaMap.get(p.motivo) ?? 0) + horas);
  }
  const bancadaRef = new Map(bancadas.map((b) => [b.id, n(b.uhReferencia) || 1]));
  const uh30d = registros30d.reduce((s, r) => s + n(r.quantidade) / (bancadaRef.get(r.bancadaId) ?? 1), 0);

  const remessasAbertas = remessas.filter((r) => !["ENTREGUE", "CANCELADA", "TOTALMENTE_EXPEDIDA"].includes(r.status));
  const remessasParciais = remessas.filter((r) => r.status === "PARCIALMENTE_EXPEDIDA").length;
  const remessasAtrasadas = remessasAbertas.filter((r) => r.dataSaidaPrevista && r.dataSaidaPrevista < agora).length;
  const totaisExp = remessas.flatMap((r) => r.itens).reduce((a, i) => ({
    prevista: a.prevista + i.quantidadePrevista,
    separada: a.separada + i.quantidadeSeparada,
    conferida: a.conferida + i.quantidadeConferida,
    carregada: a.carregada + i.quantidadeCarregada,
    expedida: a.expedida + i.quantidadeExpedida,
  }), { prevista: 0, separada: 0, conferida: 0, carregada: 0, expedida: 0 });

  const legadoContratado = kitsLegado.reduce((s, k) => s + k.quantidadeContratada, 0);
  const legadoProduzidoHistorico = kitsLegado.reduce(
    (s, k) => s + Math.max(k.quantidadeProduzidaHistorico ?? 0, k.quantidadeEntregueHistorico),
    0
  );
  const legadoProduzidoErp = kitsLegado.reduce((s, k) => s + (k.ordemProducao?.quantidadeAprovada ?? 0), 0);
  const legadoEntregueHistorico = kitsLegado.reduce((s, k) => s + k.quantidadeEntregueHistorico, 0);
  const legadoEntregueErp = remessas
    .filter((r) => r.empreendimento.origemLegado && r.status === "ENTREGUE")
    .flatMap((r) => r.itens)
    .reduce((s, item) => s + item.quantidadeExpedida, 0);

  const titulosGerados = contasReceber.reduce((s, c) => s + n(c.valor), 0);
  const recebidoErp = contasReceber.filter((c) => c.recebido).reduce((s, c) => s + n(c.valor), 0);
  const legadosFinanceiros = empreendimentosFinanceiros.filter((e) => e.origemLegado);
  const legadoFatHist = legadosFinanceiros.reduce((s, e) => s + n(e.legadoFaturadoHistorico), 0);
  const legadoRecHist = legadosFinanceiros.reduce((s, e) => s + n(e.legadoRecebidoHistorico), 0);
  const pendentes = contasReceber.filter((c) => !c.recebido);
  const emAberto = pendentes.reduce((s, c) => s + n(c.valor), 0);
  const vencidas = pendentes.filter((c) => c.dataPrevista && c.dataPrevista < agora);
  const vencido = vencidas.reduce((s, c) => s + n(c.valor), 0);
  const faixas = [
    { faixa: "0–30", min: 0, max: 30 },
    { faixa: "31–60", min: 31, max: 60 },
    { faixa: "61–90", min: 61, max: 90 },
    { faixa: "+90", min: 91, max: Number.POSITIVE_INFINITY },
  ];
  const aging = faixas.map((f) => {
    const itens = vencidas.filter((c) => {
      const dias = c.dataPrevista ? diasCorridos(c.dataPrevista, agora) : 0;
      return dias >= f.min && dias <= f.max;
    });
    return { faixa: f.faixa, valor: itens.reduce((s, c) => s + n(c.valor), 0), quantidade: itens.length };
  });

  const riscos: RiscoAnalytics[] = [];
  for (const p of backlogEng) {
    if (p.bloqueado) {
      const diasBloqueado = Math.max(1, Math.floor(p.bloqueadoHoras / 24));
      riscos.push({
        id: `eng-bloq-${p.id}`, empreendimentoId: p.empreendimentoId, empreendimentoNome: p.empreendimentoNome, area: "ENGENHARIA",
        severidade: p.bloqueadoHoras >= 72 ? "ALTA" : "MEDIA", titulo: "Pacote de Engenharia bloqueado",
        detalhe: `${p.tipologia} · ${p.motivoBloqueio ?? "motivo não informado"} · ${p.bloqueadoHoras.toFixed(1)} h registradas`,
        dias: diasBloqueado, responsavel: p.executorNome === "Não atribuído" ? null : p.executorNome, href: `/empreendimentos/${p.empreendimentoId}`
      });
      continue;
    }
    if (p.dentroSla !== false || metaEngenharia == null) continue;
    const dias = p.leadTimeDiasUteis;
    riscos.push({ id: `eng-${p.id}`, empreendimentoId: p.empreendimentoId, empreendimentoNome: p.empreendimentoNome, area: "ENGENHARIA",
      severidade: severidadePorDias(dias, metaEngenharia), titulo: `${p.disciplina === "ELETRICA" ? "Elétrica" : p.disciplina === "HIDRAULICA" ? "Hidráulica" : "Materiais"} acima do SLA`,
      detalhe: `${p.tipologia} · complexidade ${p.complexidade}/100 · ${dias} dias úteis`, dias, responsavel: p.executorNome === "Não atribuído" ? null : p.executorNome,
      href: `/empreendimentos/${p.empreendimentoId}` });
  }
  for (const e of abertasNeg) {
    const its = interacoesPorEmp.get(e.id) ?? [];
    const ultima = its.at(-1);
    if (ultima?.proximaAcaoData && ultima.proximaAcaoData < agora) {
      const dias = diasCorridos(ultima.proximaAcaoData, agora);
      riscos.push({ id: `neg-follow-${e.id}`, empreendimentoId: e.id, empreendimentoNome: e.nome, area: "NEGOCIACAO", severidade: dias > 7 ? "ALTA" : "MEDIA",
        titulo: "Follow-up vencido", detalhe: ultima.proximaAcao ?? "Próxima ação de negociação vencida", dias,
        responsavel: ultima.registradoPor?.nome ?? e.responsavelComercialUser?.nome ?? null, href: `/empreendimentos/${e.id}` });
    } else if (!ultima || ultima.createdAt < seteDiasAtras) {
      const dias = ultima ? diasCorridos(ultima.createdAt, agora) : diasCorridos(e.updatedAt, agora);
      riscos.push({ id: `neg-parada-${e.id}`, empreendimentoId: e.id, empreendimentoNome: e.nome, area: "NEGOCIACAO", severidade: dias > 14 ? "ALTA" : "MEDIA",
        titulo: "Negociação sem movimentação", detalhe: `${dias} dias sem nova interação registrada`, dias,
        responsavel: e.responsavelComercialUser?.nome ?? null, href: `/empreendimentos/${e.id}` });
    }
  }
  for (const p of pedidosAtrasados) {
    const dias = p.dataPrevistaEntrega ? diasCorridos(p.dataPrevistaEntrega, agora) : 0;
    riscos.push({ id: `pc-${p.id}`, empreendimentoId: p.empreendimentoId, empreendimentoNome: p.empreendimento.nome, area: "SUPRIMENTOS",
      severidade: dias > 7 ? "ALTA" : "MEDIA", titulo: `Pedido ${p.numero} atrasado`, detalhe: `${p.fornecedor.nomeFantasia ?? p.fornecedor.razaoSocial} · ${dias} dias`, dias,
      responsavel: null, href: "/suprimentos" });
  }
  for (const o of ordensAtrasadas) {
    const dias = o.prazo ? diasCorridos(o.prazo, agora) : 0;
    riscos.push({ id: `op-${o.id}`, empreendimentoId: o.tipologia.empreendimentoId, empreendimentoNome: o.tipologia.empreendimento.nome, area: "PRODUCAO",
      severidade: dias > 5 ? "ALTA" : "MEDIA", titulo: "Ordem de produção atrasada", detalhe: `${o.quantidadeAprovada}/${o.quantidadeAlvo} aprovados · ${dias} dias`, dias,
      responsavel: o.operadorAtual?.nome ?? null, href: "/producao" });
  }
  for (const r of remessasAbertas.filter((x) => x.dataSaidaPrevista && x.dataSaidaPrevista < agora)) {
    const dias = r.dataSaidaPrevista ? diasCorridos(r.dataSaidaPrevista, agora) : 0;
    riscos.push({ id: `rem-${r.id}`, empreendimentoId: r.empreendimentoId, empreendimentoNome: r.empreendimento.nome, area: "EXPEDICAO",
      severidade: dias > 3 ? "ALTA" : "MEDIA", titulo: `Remessa ${r.numero} com saída atrasada`, detalhe: `${dias} dias após a data prevista`, dias,
      responsavel: null, href: "/expedicao" });
  }
  for (const c of vencidas) {
    const dias = c.dataPrevista ? diasCorridos(c.dataPrevista, agora) : 0;
    riscos.push({ id: `cr-${c.id}`, empreendimentoId: c.empreendimentoId, empreendimentoNome: c.empreendimento?.nome ?? c.nomeAvulso ?? "Recebível avulso", area: "FINANCEIRO",
      severidade: dias > 30 ? "ALTA" : dias > 7 ? "MEDIA" : "BAIXA", titulo: "Título vencido", detalhe: `R$ ${n(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · ${dias} dias`, dias,
      responsavel: null, href: "/financeiro" });
  }
  for (const o of aguardandoGestor) {
    const dias = diasUteisEntre(o.enviadoAprovacaoEm ?? o.updatedAt, agora);
    const limite = config?.metaDiasOrcamentacao ? n(config.metaDiasOrcamentacao) : 5;
    if (dias <= limite) continue;
    const emp = empreendimentos.find((e) => e.id === o.empreendimentoId);
    riscos.push({ id: `orc-${o.id}`, empreendimentoId: o.empreendimentoId, empreendimentoNome: emp?.nome ?? "Empreendimento", area: "ORCAMENTACAO",
      severidade: severidadePorDias(dias, limite), titulo: "Aprovação de orçamento parada", detalhe: `${dias} dias úteis aguardando gestor`, dias,
      responsavel: o.responsavel?.nome ?? emp?.responsavelOrcamentacaoUser?.nome ?? null, href: `/empreendimentos/${o.empreendimentoId}/orcamento` });
  }
  riscos.sort((a, b) => {
    const peso = { ALTA: 3, MEDIA: 2, BAIXA: 1 } as const;
    return peso[b.severidade] - peso[a.severidade] || (b.dias ?? 0) - (a.dias ?? 0);
  });

  return {
    geradoEm: agora,
    carteira: {
      ativos: ativos.length,
      legadosAtivos: ativos.filter((e) => e.origemLegado).length,
      valorCarteira,
      valorEmNegociacao: abertasNeg.reduce((s, e) => s + (valorNegociacaoAtualPorEmp.get(e.id) ?? valorEmp.get(e.id) ?? 0), 0),
      valorContratado,
      valorEmProducao,
      clientesAtivos,
    },
    pipeline,
    comercial: {
      ganhos30d: ganhos30d.length,
      valorGanho30d: ganhos30d.reduce((s, i) => s + valorInteracao(i), 0),
      perdidos30d: perdidos30d.length,
      valorPerdido30d: perdidos30d.reduce((s, i) => s + valorInteracao(i), 0),
      taxaConversao30d: terminal30d.length ? arred((ganhos30d.length / terminal30d.length) * 100) : null,
    },
    engenharia: {
      backlog: backlogEng.length,
      entregue30dPontos: Math.round(porPessoa.reduce((s, p) => s + p.entreguePontos, 0)),
      validados30d: validados30.length,
      foraSla: foraSlaEng,
      complexidadeBacklog: Math.round(backlogEng.reduce((s, p) => s + p.complexidade, 0)),
      leadTimeMedioDias: media(leadEng),
      amostrasLeadTime: leadEng.length,
      porPessoa,
      pacotesAbertos: [...backlogEng].sort((a, b) => Number(b.bloqueado) - Number(a.bloqueado) || Number(b.dentroSla === false) - Number(a.dentroSla === false) || b.complexidade - a.complexidade || b.leadTimeDiasUteis - a.leadTimeDiasUteis),
      pacotesCriticos: [...backlogEng].sort((a, b) => Number(b.bloqueado) - Number(a.bloqueado) || Number(b.dentroSla === false) - Number(a.dentroSla === false) || b.complexidade - a.complexidade || b.leadTimeDiasUteis - a.leadTimeDiasUteis).slice(0, 20),
      executoresDisponiveis: usuariosAtivos,
      bloqueados: backlogEng.filter((p) => p.bloqueado).length,
      retrabalhosObservados30d: eventosEngenharia30d.filter((ev) => ev.tipo === "RETRABALHO").length,
      firstPassYieldPct,
      firstPassYieldAmostras: qualidadeAmostra.length,
      capacidadePorDisciplina,
      instrumentacaoTempoAtivoDisponivel: false,
    },
    orcamentacao: {
      emElaboracao: orcamentos.filter((o) => ["EM_LEVANTAMENTO", "ORCAMENTO_DEVOLVIDO"].includes(o.status)).length,
      aguardandoGestor: aguardandoGestor.length,
      devolvidos30d: devolvidos30,
      aprovados30d: aprovados30,
      valorAguardandoGestor: aguardandoGestor.reduce((s, o) => s + n(o.totalServicosHgi) + n(o.totalMateriais), 0),
      tempoMedioFilaGestorDias: media(filaGestorDias),
    },
    negociacao: {
      abertas: abertasNeg.length,
      valorAberto: abertasNeg.reduce((s, e) => s + (valorNegociacaoAtualPorEmp.get(e.id) ?? valorEmp.get(e.id) ?? 0), 0),
      followupsVencidos,
      semInteracao7d,
      descontoMedioPct: media(descontos),
      motivosPerda: Array.from(motivosMap.entries()).map(([motivo, v]) => ({ motivo, ...v })).sort((a, b) => b.valor - a.valor),
    },
    suprimentos: {
      cotacoesSemResposta,
      pedidosAbertos: pedidosAbertos.length,
      pedidosAtrasados: pedidosAtrasados.length,
      valorPedidosAbertos,
      itensPendentesRecebimento,
      tempoMedioMaterialAteProducaoDias: media(diasMaterialProducao),
    },
    producao: {
      ordensPendentes: ordens.filter((o) => o.status === "PENDENTE").length,
      ordensEmAndamento: ordens.filter((o) => o.status === "EM_ANDAMENTO").length,
      ordensPausadas: ordens.filter((o) => o.status === "PAUSADA").length,
      ordensAtrasadas: ordensAtrasadas.length,
      uh30d: arred(uh30d),
      retrabalho,
      perdas,
      tempoParadoHoras30d: arred(tempoParadoHoras),
      motivosParada: Array.from(pausaMap.entries()).map(([motivo, horas]) => ({ motivo, horas: arred(horas) })).sort((a, b) => b.horas - a.horas),
      legadoContratado,
      legadoProduzidoHistorico,
      legadoProduzidoErp,
      legadoEntregueHistorico,
      legadoEntregueErp,
    },
    expedicao: {
      remessasAbertas: remessasAbertas.length,
      remessasParciais,
      remessasAtrasadas,
      quantidadePrevista: totaisExp.prevista,
      quantidadeSeparada: totaisExp.separada,
      quantidadeConferida: totaisExp.conferida,
      quantidadeCarregada: totaisExp.carregada,
      quantidadeExpedida: totaisExp.expedida,
      gapProduzidoExpedido: null, // produção normal ainda não tem uma unidade única por kit confiável para comparar com expedição.
    },
    financeiro: {
      valorContratado: valorContratadoFinanceiro,
      faturadoHistoricoLegado: legadoFatHist,
      titulosGerados,
      recebido: recebidoErp + legadoRecHist,
      recebidoHistoricoLegado: legadoRecHist,
      emAberto,
      vencido,
      vencidosQuantidade: vencidas.length,
      aging,
      confiabilidadeFaturadoPosErp: "INDISPONIVEL",
    },
    riscos,
    coordenacao: {
      criticos: riscos.filter((r) => r.severidade === "ALTA").length,
      foraSla: riscos.filter((r) => ["ENGENHARIA", "ORCAMENTACAO"].includes(r.area)).length,
      bloqueios: riscos.filter((r) => ["SUPRIMENTOS", "PRODUCAO", "EXPEDICAO"].includes(r.area)).length,
      fila: riscos.slice(0, 30),
    },
  };
}
