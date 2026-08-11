import { prisma } from "@/infra/db/prisma/client";

export interface CardResumo {
  totalKits: number;
  concluidos: number;
  emProducao: number;
  aguardando: number;
  parados: number;
}

export interface LinhaTipologia {
  codigo: string;
  tipologiaNome: string;
  statusTexto: string;
  statusCategoria: "concluido" | "producao" | "aguardando" | "parado";
  progressoPct: number;
  inicio: string | null;
  previsao: string | null;
  responsavelNome: string | null;
}

export interface TorreComparativo {
  torreNome: string;
  pct: number;
  concluidos: number;
  total: number;
}

export interface Alerta {
  severidade: "critico" | "atencao";
  titulo: string;
  detalhe: string;
}

export interface VidaProducaoV2 {
  empreendimentoNome: string;
  clienteNome: string;
  cidadeEstado: string;
  responsavelNome: string | null;
  previsaoEntrega: string | null;
  progressoGeralPct: number;

  cards: CardResumo;
  tabela: LinhaTipologia[];
  torres: TorreComparativo[];
  alertas: Alerta[];

  ritmoAtualPorHora: number;
  metaPorHora: number;
}

const STATUS_MAP: Record<string, { texto: string; categoria: LinhaTipologia["statusCategoria"] }> = {
  CONCLUIDA: { texto: "Finalizado", categoria: "concluido" },
  EM_ANDAMENTO: { texto: "Em Produção", categoria: "producao" },
  PAUSADA: { texto: "Parado", categoria: "parado" },
  PENDENTE: { texto: "Aguardando", categoria: "aguardando" },
};

export async function buscarVidaProducaoV2(empreendimentoId: string): Promise<VidaProducaoV2 | null> {
  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: {
      nome: true,
      cidade: true,
      estado: true,
      cliente: { select: { razaoSocial: true, nomeFantasia: true } },
      responsavelOrcamentacaoUser: { select: { nome: true } },
      tipologias: {
        select: {
          id: true,
          nome: true,
          quantidadeUnidades: true,
          unidades: {
            select: {
              pavimento: { select: { torre: { select: { nome: true } } } },
            },
          },
        },
      },
    },
  });
  if (!empreendimento) return null;

  const ordens = await prisma.ordemProducao.findMany({
    where: { tipologia: { empreendimentoId } },
    include: {
      tipologia: { select: { id: true, nome: true } },
      bancada: { select: { nome: true, ordem: true } },
      operadorAtual: { select: { nome: true } },
    },
  });

  const pavimentos = await prisma.pavimento.findMany({
    where: { torre: { empreendimentoId } },
    select: { dataPrevistaRemessa: true },
  });
  const datasRemessa = pavimentos
    .map((p) => p.dataPrevistaRemessa)
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime());
  const previsaoEntrega = datasRemessa[0] ? datasRemessa[0].toISOString().slice(0, 10) : null;

  const bancadaFinalOrdem = Math.max(...ordens.map((o) => o.bancada.ordem), 0);

  const totalKits = empreendimento.tipologias.reduce((s, t) => s + t.quantidadeUnidades, 0);
  const concluidos = ordens
    .filter((o) => o.bancada.ordem === bancadaFinalOrdem && o.status === "CONCLUIDA")
    .reduce((s, o) => s + o.quantidadeAprovada, 0);
  const emProducao = ordens.filter((o) => o.status === "EM_ANDAMENTO").reduce((s, o) => s + o.quantidadeAprovada, 0);
  const aguardando = ordens.filter((o) => o.status === "PENDENTE").reduce((s, o) => s + o.quantidadeAlvo, 0);
  const parados = ordens.filter((o) => o.status === "PAUSADA").length;

  const progressoGeralPct = totalKits > 0 ? Math.round((concluidos / totalKits) * 100) : 0;

  const tabela: LinhaTipologia[] = empreendimento.tipologias.map((t, i) => {
    const ordensDaTipologia = ordens
      .filter((o) => o.tipologia.id === t.id)
      .sort((a, b) => b.bancada.ordem - a.bancada.ordem);
    const atual = ordensDaTipologia[0];
    const info = atual
      ? (STATUS_MAP[atual.status] ?? { texto: atual.status, categoria: "aguardando" as const })
      : { texto: "Aguardando", categoria: "aguardando" as const };
    const progressoPct =
      atual && atual.quantidadeAlvo > 0 ? Math.round((atual.quantidadeAprovada / atual.quantidadeAlvo) * 100) : 0;

    return {
      codigo: `T-${String(i + 1).padStart(3, "0")}`,
      tipologiaNome: t.nome,
      statusTexto: info.texto,
      statusCategoria: info.categoria,
      progressoPct,
      inicio: atual?.iniciadaEm ? atual.iniciadaEm.toISOString().slice(0, 10) : null,
      previsao: previsaoEntrega,
      responsavelNome: atual?.operadorAtual?.nome ?? null,
    };
  });

  const torresMap = new Map<string, { total: number; concluidos: number }>();
  for (const t of empreendimento.tipologias) {
    const porTorre = new Map<string, number>();
    for (const u of t.unidades) {
      const nome = u.pavimento.torre?.nome ?? "Sem torre";
      porTorre.set(nome, (porTorre.get(nome) ?? 0) + 1);
    }
    const totalUnidadesTipologia = t.unidades.length || 1;
    const ordemFinalTipologia = ordens.find(
      (o) => o.tipologia.id === t.id && o.bancada.ordem === bancadaFinalOrdem
    );
    const concluidosTipologia = ordemFinalTipologia?.quantidadeAprovada ?? 0;

    for (const [torreNome, qtdNaTorre] of porTorre) {
      const proporcao = qtdNaTorre / totalUnidadesTipologia;
      const atual = torresMap.get(torreNome) ?? { total: 0, concluidos: 0 };
      atual.total += qtdNaTorre;
      atual.concluidos += concluidosTipologia * proporcao;
      torresMap.set(torreNome, atual);
    }
  }
  const torres: TorreComparativo[] = Array.from(torresMap.entries()).map(([torreNome, v]) => ({
    torreNome,
    pct: v.total > 0 ? Math.round((v.concluidos / v.total) * 100) : 0,
    concluidos: Math.round(v.concluidos),
    total: v.total,
  }));

  const alertas: Alerta[] = [];
  for (const o of ordens.filter((op) => op.status === "PAUSADA")) {
    const pausaAberta = await prisma.pausaOrdemProducao.findFirst({
      where: { ordemProducaoId: o.id, fim: null },
      orderBy: { inicio: "desc" },
    });
    if (pausaAberta) {
      const horas = Math.floor((Date.now() - pausaAberta.inicio.getTime()) / (1000 * 60 * 60));
      alertas.push({
        severidade: horas >= 4 ? "critico" : "atencao",
        titulo: `${o.numero} parada há ${horas}h`,
        detalhe: `${o.tipologia.nome} · ${o.bancada.nome} — ${pausaAberta.motivo}`,
      });
    }
  }

  const horasTotais = ordens.reduce((s, o) => s + o.tempoTotalSegundos, 0) / 3600;
  const ritmoAtualPorHora = horasTotais > 0.01 ? Math.round((concluidos / horasTotais) * 10) / 10 : 0;

  const bancadasEnvolvidas = await prisma.bancada.findMany({
    where: { id: { in: Array.from(new Set(ordens.map((o) => o.bancadaId))) } },
    select: { uhReferencia: true },
  });
  const metaPorHora =
    bancadasEnvolvidas.length > 0
      ? Math.round(
          (bancadasEnvolvidas.reduce((s, b) => s + Number(b.uhReferencia), 0) / bancadasEnvolvidas.length) * 10
        ) / 10
      : 0;

  return {
    empreendimentoNome: empreendimento.nome,
    clienteNome: empreendimento.cliente.nomeFantasia ?? empreendimento.cliente.razaoSocial,
    cidadeEstado: [empreendimento.cidade, empreendimento.estado].filter(Boolean).join("/"),
    responsavelNome: empreendimento.responsavelOrcamentacaoUser?.nome ?? null,
    previsaoEntrega,
    progressoGeralPct,
    cards: { totalKits, concluidos, emProducao, aguardando, parados },
    tabela,
    torres,
    alertas,
    ritmoAtualPorHora,
    metaPorHora,
  };
}
