import { prisma } from "@/infra/db/prisma/client";
import { listarBancadas } from "@/features/producao/actions/producao-actions";
import { calcularQuantidadeUH } from "@/core/producao/entities/producao";

export interface ItemFilaProducao {
  empreendimentoId: string;
  empreendimentoNome: string;
  tipologiaId: string;
  tipologiaNome: string;
  statusProducao: "ATIVA" | "STANDBY" | "CONCLUIDA";
  dataProximaRemessa: string | null;
  diasUteisAteRemessa: number | null;
  progressoPercentual: number; // média das 5 bancadas, 0-100
  risco: "ALTO" | "MEDIO" | "BAIXO" | "SEM_DATA" | "STANDBY";
}

function diasUteisAteData(alvo: Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  alvo.setHours(0, 0, 0, 0);
  if (alvo <= hoje) return 0;

  let dias = 0;
  const atual = new Date(hoje);
  while (atual < alvo) {
    atual.setDate(atual.getDate() + 1);
    const diaSemana = atual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
  }
  return dias;
}

/**
 * Fila de produção priorizada por urgência — cruza a data de remessa
 * (Cronograma de Remessas) com o progresso real por bancada. É a visão
 * que falta pra gestão: não é "o que fazer agora" (isso é o tablet do
 * operador), é "o que vai atrasar se ninguém priorizar".
 */
export async function calcularFilaDeProducao(): Promise<ItemFilaProducao[]> {
  const empreendimentos = await prisma.empreendimento.findMany({
    where: { status: { in: ["CONTRATADO", "SUPRIMENTOS", "PRODUCAO"] }, excluidoEm: null },
    select: {
      id: true,
      nome: true,
      tipologias: { select: { id: true, nome: true, quantidadeUnidades: true, statusProducao: true } },
    },
  });
  const todasTipologias = empreendimentos.flatMap((e) => e.tipologias);
  const tipologiaIds = todasTipologias.map((t) => t.id);
  const bancadas = await listarBancadas();

  // Tudo em consultas ÚNICAS (não uma por tipologia×bancada) — antes
  // isso era um loop aninhado chamando listarPecasComProgresso N×M
  // vezes; agora são só 3 consultas agregadas no total, não importa
  // quantas obras/tipologias existam.
  const [pecasPorTipologia, somaConcluidasPorTipologiaBancada, remessasPorTipologia] = await Promise.all([
    prisma.pecaLevantamento.groupBy({
      by: ["levantamentoId"],
      where: { levantamento: { tipologiaId: { in: tipologiaIds }, status: "VALIDADO" } },
      _count: { id: true },
    }),
    prisma.registroProducao.groupBy({
      by: ["tipologiaId", "bancadaId"],
      where: { tipologiaId: { in: tipologiaIds } },
      _sum: { unidadesConcluidas: true },
    }),
    prisma.unidade.findMany({
      where: { tipologiaId: { in: tipologiaIds } },
      select: { tipologiaId: true, pavimento: { select: { dataPrevistaRemessa: true } } },
    }),
  ]);

  // pecasPorTipologia veio agrupado por levantamentoId, não tipologiaId
  // diretamente — precisa de um segundo passo pra religar. Busca os
  // levantamentos correspondentes pra saber a tipologia de cada um.
  const levantamentos = await prisma.levantamentoEletrico.findMany({
    where: { tipologiaId: { in: tipologiaIds }, status: "VALIDADO" },
    select: { id: true, tipologiaId: true },
  });
  const tipologiaPorLevantamento = new Map(levantamentos.map((l) => [l.id, l.tipologiaId]));
  const qtdPecasPorTipologia = new Map<string, number>();
  for (const grupo of pecasPorTipologia) {
    const tipId = tipologiaPorLevantamento.get(grupo.levantamentoId);
    if (!tipId) continue;
    qtdPecasPorTipologia.set(tipId, (qtdPecasPorTipologia.get(tipId) ?? 0) + grupo._count.id);
  }

  const concluidasPorChave = new Map<string, number>();
  for (const g of somaConcluidasPorTipologiaBancada) {
    concluidasPorChave.set(`${g.tipologiaId}-${g.bancadaId}`, g._sum.unidadesConcluidas ?? 0);
  }

  const datasRemessaPorTipologia = new Map<string, Date[]>();
  for (const u of remessasPorTipologia) {
    if (!u.pavimento.dataPrevistaRemessa || !u.tipologiaId) continue;
    const arr = datasRemessaPorTipologia.get(u.tipologiaId) ?? [];
    arr.push(u.pavimento.dataPrevistaRemessa);
    datasRemessaPorTipologia.set(u.tipologiaId, arr);
  }

  const resultado: ItemFilaProducao[] = [];

  for (const emp of empreendimentos) {
    for (const tipologia of emp.tipologias) {
      const datas = (datasRemessaPorTipologia.get(tipologia.id) ?? []).sort((a, b) => a.getTime() - b.getTime());
      const dataProximaRemessa = datas[0] ?? null;
      const diasUteisAteRemessa = dataProximaRemessa ? diasUteisAteData(new Date(dataProximaRemessa)) : null;

      const qtdPecas = qtdPecasPorTipologia.get(tipologia.id) ?? 0;
      const totalNecessarioPorBancada = qtdPecas * tipologia.quantidadeUnidades;

      let somaPct = 0;
      let bancadasComDado = 0;
      if (totalNecessarioPorBancada > 0) {
        for (const bancada of bancadas) {
          const concluidas = concluidasPorChave.get(`${tipologia.id}-${bancada.id}`) ?? 0;
          if (concluidas === 0) continue;
          somaPct += Math.min((concluidas / totalNecessarioPorBancada) * 100, 100);
          bancadasComDado++;
        }
      }
      const progressoPercentual = bancadasComDado > 0 ? Math.round(somaPct / bancadas.length) : 0;

      if (tipologia.statusProducao === "CONCLUIDA") continue;
      if (bancadasComDado === 0 && !dataProximaRemessa) continue;

      let risco: ItemFilaProducao["risco"];
      if (tipologia.statusProducao === "STANDBY") {
        risco = "STANDBY";
      } else if (diasUteisAteRemessa === null) {
        risco = "SEM_DATA";
      } else if (diasUteisAteRemessa <= 3 && progressoPercentual < 70) {
        risco = "ALTO";
      } else if (diasUteisAteRemessa <= 7 && progressoPercentual < 50) {
        risco = "MEDIO";
      } else {
        risco = "BAIXO";
      }

      resultado.push({
        empreendimentoId: emp.id,
        empreendimentoNome: emp.nome,
        tipologiaId: tipologia.id,
        tipologiaNome: tipologia.nome,
        statusProducao: tipologia.statusProducao,
        dataProximaRemessa: dataProximaRemessa ? dataProximaRemessa.toISOString().slice(0, 10) : null,
        diasUteisAteRemessa,
        progressoPercentual,
        risco,
      });
    }
  }

  const ordemRisco = { ALTO: 0, MEDIO: 1, BAIXO: 2, SEM_DATA: 3, STANDBY: 4 };
  return resultado.sort((a, b) => {
    if (ordemRisco[a.risco] !== ordemRisco[b.risco]) return ordemRisco[a.risco] - ordemRisco[b.risco];
    return (a.diasUteisAteRemessa ?? 999) - (b.diasUteisAteRemessa ?? 999);
  });
}

export interface GargaloBancada {
  bancadaId: string;
  bancadaNome: string;
  quantidadeUHHoje: number;
}

/** Produção de hoje por bancada, em U.H. — pra ver onde a linha está afogada ou ociosa. */
export async function calcularGargaloPorBancada(): Promise<GargaloBancada[]> {
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const bancadas = await listarBancadas();
  const resultado: GargaloBancada[] = [];

  for (const bancada of bancadas) {
    const soma = await prisma.registroProducao.aggregate({
      where: { bancadaId: bancada.id, createdAt: { gte: inicioDia } },
      _sum: { quantidade: true },
    });
    const bruta = Number(soma._sum.quantidade ?? 0);
    resultado.push({
      bancadaId: bancada.id,
      bancadaNome: bancada.nome,
      quantidadeUHHoje: calcularQuantidadeUH(bruta, bancada.uhReferencia),
    });
  }

  return resultado;
}

// ---------------------------------------------------------------------------
// Ações recomendadas — a peça que faltava: não é só mostrar risco e
// gargalo, é traduzir isso em "faça isso". Sempre com o motivo junto,
// nunca uma sugestão sem explicação.
// ---------------------------------------------------------------------------

export interface AcaoRecomendada {
  tipo: "RISCO_ATRASO" | "REALOCACAO" | "SEM_DONO";
  titulo: string;
  detalhe: string;
  empreendimentoId?: string;
}

export async function gerarAcoesRecomendadas(): Promise<AcaoRecomendada[]> {
  const [fila, gargalo, semDono] = await Promise.all([
    calcularFilaDeProducao(),
    calcularGargaloPorBancada(),
    listarItensSemDono(),
  ]);

  const acoes: AcaoRecomendada[] = [];

  // 1. Risco de atraso — o mais urgente, sempre primeiro.
  for (const item of fila.filter((f) => f.risco === "ALTO")) {
    acoes.push({
      tipo: "RISCO_ATRASO",
      titulo: `Priorizar ${item.tipologiaNome} — ${item.empreendimentoNome}`,
      detalhe: `Remessa em ${item.diasUteisAteRemessa} dia(s) úteis, só ${item.progressoPercentual}% pronto.`,
      empreendimentoId: item.empreendimentoId,
    });
  }

  // 2. Realocação — só sugere, nunca decide sozinho. Compara a bancada
  // com MENOS produção hoje contra a com MAIS, e só sugere se a
  // diferença for grande o suficiente pra valer a pena (senão vira
  // ruído todo dia).
  if (gargalo.length >= 2) {
    const ordenado = [...gargalo].sort((a, b) => a.quantidadeUHHoje - b.quantidadeUHHoje);
    const maisOciosa = ordenado[0];
    const maisTravada = ordenado[ordenado.length - 1];
    if (maisOciosa && maisTravada && maisTravada.quantidadeUHHoje > 0 && maisOciosa.quantidadeUHHoje < maisTravada.quantidadeUHHoje * 0.4) {
      acoes.push({
        tipo: "REALOCACAO",
        titulo: `Considere realocar operador: ${maisOciosa.bancadaNome} → ${maisTravada.bancadaNome}`,
        detalhe: `${maisOciosa.bancadaNome} está com ${maisOciosa.quantidadeUHHoje.toFixed(1)} U.H. hoje, bem abaixo de ${maisTravada.bancadaNome} (${maisTravada.quantidadeUHHoje.toFixed(1)} U.H.) — pode valer mover gente pra equilibrar.`,
      });
    }
  }

  // 3. Sem dono / parado — conecta com o Tempo de Ciclo.
  for (const item of semDono.slice(0, 5)) {
    acoes.push({
      tipo: "SEM_DONO",
      titulo: `${item.tipo} parado — ${item.empreendimentoNome}`,
      detalhe: `${item.tipologiaNome}: em rascunho há ${item.diasEmAberto} dias úteis, sem validar.`,
      empreendimentoId: item.empreendimentoId,
    });
  }

  return acoes;
}

// ---------------------------------------------------------------------------
// Visão por obra — agrupa a fila (já calculada) pelo empreendimento, com
// o pior risco entre as tipologias representando a obra inteira. Um
// gestor pensa "como está a obra X" antes de pensar tipologia por
// tipologia.
// ---------------------------------------------------------------------------

export interface ObraAgrupada {
  empreendimentoId: string;
  empreendimentoNome: string;
  piorRisco: ItemFilaProducao["risco"];
  tipologias: ItemFilaProducao[];
}

export async function agruparFilaPorObra(): Promise<ObraAgrupada[]> {
  const fila = await calcularFilaDeProducao();
  const ordemRisco = { ALTO: 0, MEDIO: 1, BAIXO: 2, SEM_DATA: 3, STANDBY: 4 };

  const mapa = new Map<string, ObraAgrupada>();
  for (const item of fila) {
    const existente = mapa.get(item.empreendimentoId);
    if (existente) {
      existente.tipologias.push(item);
      if (ordemRisco[item.risco] < ordemRisco[existente.piorRisco]) existente.piorRisco = item.risco;
    } else {
      mapa.set(item.empreendimentoId, {
        empreendimentoId: item.empreendimentoId,
        empreendimentoNome: item.empreendimentoNome,
        piorRisco: item.risco,
        tipologias: [item],
      });
    }
  }

  return Array.from(mapa.values()).sort((a, b) => ordemRisco[a.piorRisco] - ordemRisco[b.piorRisco]);
}

// ---------------------------------------------------------------------------
// Ritmo da semana — kits finalizados por dia, últimos 14 dias, pra
// comparar essa semana contra a passada. Uma foto do dia não mostra
// tendência; isso mostra.
// ---------------------------------------------------------------------------

export interface RitmoDia {
  data: string; // YYYY-MM-DD
  kits: number;
}

export async function calcularRitmoSemanal(): Promise<{ dias: RitmoDia[]; totalEstaSemana: number; totalSemanaPassada: number }> {
  const bancadaFinalizacao = await prisma.bancada.findUnique({ where: { nome: "Finalização" } });
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - 13);

  const dias: RitmoDia[] = [];
  let totalEstaSemana = 0;
  let totalSemanaPassada = 0;

  for (let i = 0; i < 14; i++) {
    const diaInicio = new Date(inicio);
    diaInicio.setDate(diaInicio.getDate() + i);
    const diaFim = new Date(diaInicio);
    diaFim.setDate(diaFim.getDate() + 1);

    const soma = bancadaFinalizacao
      ? await prisma.registroProducao.aggregate({
          where: { bancadaId: bancadaFinalizacao.id, createdAt: { gte: diaInicio, lt: diaFim } },
          _sum: { unidadesConcluidas: true },
        })
      : { _sum: { unidadesConcluidas: 0 } };

    const kits = soma._sum.unidadesConcluidas ?? 0;
    dias.push({ data: diaInicio.toISOString().slice(0, 10), kits });

    if (i < 7) totalSemanaPassada += kits;
    else totalEstaSemana += kits;
  }

  return { dias, totalEstaSemana, totalSemanaPassada };
}

// ---------------------------------------------------------------------------
// Sem dono / parado — levantamentos em rascunho há mais de 7 dias úteis,
// sinal de gap de processo (ninguém está cuidando disso).
// ---------------------------------------------------------------------------

export interface ItemSemDono {
  empreendimentoId: string;
  empreendimentoNome: string;
  tipologiaNome: string;
  tipo: string;
  diasEmAberto: number;
}

export async function listarItensSemDono(): Promise<ItemSemDono[]> {
  const { listarTempoDeCicloLevantamentos } = await import("@/features/engenharia/lib/tempo-de-ciclo");
  const linhas = await listarTempoDeCicloLevantamentos();
  return linhas
    .filter((l) => l.status !== "VALIDADO" && l.diasEmAberto > 7)
    .map((l) => ({
      empreendimentoId: l.empreendimentoId,
      empreendimentoNome: l.empreendimentoNome,
      tipologiaNome: l.tipologiaNome,
      tipo: l.tipo,
      diasEmAberto: l.diasEmAberto,
    }));
}

// ---------------------------------------------------------------------------
// Status de Produção do Empreendimento — rollup calculado a partir do
// progresso de TODAS as tipologias dele. Diferente do status geral do
// empreendimento (que é sobre a jornada comercial/contratual) e do
// Tipologia.statusProducao (que é individual por tipologia) — esse é a
// visão consolidada: "como está a produção da obra inteira".
// ---------------------------------------------------------------------------

export type StatusProducaoEmpreendimento = "NAO_INICIADA" | "EM_ANDAMENTO" | "CONCLUIDA" | "SEM_TIPOLOGIA";

export interface ResumoProducaoEmpreendimento {
  status: StatusProducaoEmpreendimento;
  progressoMedio: number; // 0-100, média das tipologias ativas (exclui stand-by)
  totalTipologias: number;
  tipologiasConcluidas: number;
  tipologiasEmStandby: number;
}

export async function calcularStatusProducaoEmpreendimento(
  empreendimentoId: string
): Promise<ResumoProducaoEmpreendimento> {
  const tipologias = await prisma.tipologia.findMany({
    where: { empreendimentoId },
    select: { id: true, quantidadeUnidades: true, statusProducao: true },
  });

  if (tipologias.length === 0) {
    return { status: "SEM_TIPOLOGIA", progressoMedio: 0, totalTipologias: 0, tipologiasConcluidas: 0, tipologiasEmStandby: 0 };
  }

  const bancadas = await listarBancadas();
  const tipologiaIds = tipologias.map((t) => t.id);

  const [pecasPorLevantamento, somaConcluidas] = await Promise.all([
    prisma.pecaLevantamento.groupBy({
      by: ["levantamentoId"],
      where: { levantamento: { tipologiaId: { in: tipologiaIds }, status: "VALIDADO" } },
      _count: { id: true },
    }),
    prisma.registroProducao.groupBy({
      by: ["tipologiaId", "bancadaId"],
      where: { tipologiaId: { in: tipologiaIds } },
      _sum: { unidadesConcluidas: true },
    }),
  ]);

  const levantamentos = await prisma.levantamentoEletrico.findMany({
    where: { tipologiaId: { in: tipologiaIds }, status: "VALIDADO" },
    select: { id: true, tipologiaId: true },
  });
  const tipologiaPorLevantamento = new Map(levantamentos.map((l) => [l.id, l.tipologiaId]));
  const qtdPecasPorTipologia = new Map<string, number>();
  for (const grupo of pecasPorLevantamento) {
    const tipId = tipologiaPorLevantamento.get(grupo.levantamentoId);
    if (!tipId) continue;
    qtdPecasPorTipologia.set(tipId, (qtdPecasPorTipologia.get(tipId) ?? 0) + grupo._count.id);
  }
  const concluidasPorChave = new Map<string, number>();
  for (const g of somaConcluidas) {
    concluidasPorChave.set(`${g.tipologiaId}-${g.bancadaId}`, g._sum.unidadesConcluidas ?? 0);
  }

  let somaProgresso = 0;
  let tipologiasConsideradas = 0; // exclui stand-by do cálculo de média
  let tipologiasConcluidas = 0;
  let tipologiasEmStandby = 0;

  for (const tip of tipologias) {
    if (tip.statusProducao === "STANDBY") {
      tipologiasEmStandby++;
      continue;
    }
    if (tip.statusProducao === "CONCLUIDA") {
      tipologiasConcluidas++;
      somaProgresso += 100;
      tipologiasConsideradas++;
      continue;
    }

    const qtdPecas = qtdPecasPorTipologia.get(tip.id) ?? 0;
    const totalNecessario = qtdPecas * tip.quantidadeUnidades;
    let progresso = 0;
    if (totalNecessario > 0) {
      let somaPct = 0;
      let bancadasComDado = 0;
      for (const bancada of bancadas) {
        const concluidas = concluidasPorChave.get(`${tip.id}-${bancada.id}`) ?? 0;
        if (concluidas === 0) continue;
        somaPct += Math.min((concluidas / totalNecessario) * 100, 100);
        bancadasComDado++;
      }
      progresso = bancadasComDado > 0 ? Math.round(somaPct / bancadas.length) : 0;
    }
    if (progresso >= 100) tipologiasConcluidas++;
    somaProgresso += progresso;
    tipologiasConsideradas++;
  }

  const progressoMedio = tipologiasConsideradas > 0 ? Math.round(somaProgresso / tipologiasConsideradas) : 0;

  let status: StatusProducaoEmpreendimento;
  if (tipologiasConsideradas === 0) {
    // todas em stand-by — não dá pra dizer "não iniciada" nem "concluída"
    status = "NAO_INICIADA";
  } else if (progressoMedio === 0) {
    status = "NAO_INICIADA";
  } else if (tipologiasConcluidas === tipologiasConsideradas) {
    status = "CONCLUIDA";
  } else {
    status = "EM_ANDAMENTO";
  }

  return {
    status,
    progressoMedio,
    totalTipologias: tipologias.length,
    tipologiasConcluidas,
    tipologiasEmStandby,
  };
}
