import { prisma } from "@/infra/db/prisma/client";

/**
 * Conta dias ÚTEIS entre duas datas (exclui sábado e domingo) — a
 * operação não roda no fim de semana, então "5 dias parado" de
 * sexta pra segunda não deveria contar como atraso real.
 */
function diasUteisEntre(inicio: Date, fim: Date): number {
  let dias = 0;
  const atual = new Date(inicio);
  atual.setHours(0, 0, 0, 0);
  const fimSemHora = new Date(fim);
  fimSemHora.setHours(0, 0, 0, 0);

  while (atual < fimSemHora) {
    atual.setDate(atual.getDate() + 1);
    const diaSemana = atual.getDay(); // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
  }
  return Math.max(0, dias);
}

export interface LinhaTempoLevantamento {
  empreendimentoId: string;
  empreendimentoNome: string;
  tipologiaNome: string;
  tipo: "Elétrico" | "Hidráulico" | "Materiais";
  status: string;
  criadoEm: Date;
  validadoEm: Date | null;
  diasEmAberto: number; // dias desde criado até validado (ou até hoje, se ainda em rascunho)
}

/**
 * Tempo de ciclo de cada levantamento — quanto tempo passou entre a
 * criação (RASCUNHO) e a validação. Pra levantamentos ainda em
 * RASCUNHO, conta até hoje (mostra o que já está demorando demais).
 * Serve pra identificar gargalos: se um tipo específico consistentemente
 * demora mais, é sinal de gap de processo, não só "esse caso foi lento".
 */
export async function listarTempoDeCicloLevantamentos(): Promise<LinhaTempoLevantamento[]> {
  const hoje = new Date();

  const [eletricos, hidraulicos, materiais] = await Promise.all([
    prisma.levantamentoEletrico.findMany({
      select: {
        empreendimentoId: true,
        empreendimento: { select: { nome: true } },
        tipologia: { select: { nome: true } },
        status: true,
        createdAt: true,
        validadoEm: true,
      },
    }),
    prisma.levantamentoHidraulico.findMany({
      select: {
        empreendimentoId: true,
        empreendimento: { select: { nome: true } },
        tipologia: { select: { nome: true } },
        status: true,
        createdAt: true,
        validadoEm: true,
      },
    }),
    prisma.levantamentoMateriais.findMany({
      select: {
        empreendimentoId: true,
        empreendimento: { select: { nome: true } },
        tipologia: { select: { nome: true } },
        status: true,
        createdAt: true,
        validadoEm: true,
      },
    }),
  ]);

  function mapear(
    arr: typeof eletricos,
    tipo: LinhaTempoLevantamento["tipo"]
  ): LinhaTempoLevantamento[] {
    return arr.map((l) => {
      const fim = l.validadoEm ?? hoje;
      const diasEmAberto = diasUteisEntre(l.createdAt, fim);
      return {
        empreendimentoId: l.empreendimentoId,
        empreendimentoNome: l.empreendimento.nome,
        tipologiaNome: l.tipologia.nome,
        tipo,
        status: l.status,
        criadoEm: l.createdAt,
        validadoEm: l.validadoEm,
        diasEmAberto,
      };
    });
  }

  const todas = [
    ...mapear(eletricos, "Elétrico"),
    ...mapear(hidraulicos, "Hidráulico"),
    ...mapear(materiais, "Materiais"),
  ];

  // Pendentes (ainda em rascunho, acumulando dias) primeiro — é o que
  // precisa de atenção agora. Validados ficam depois, como histórico.
  return todas.sort((a, b) => {
    const aPendente = a.status !== "VALIDADO";
    const bPendente = b.status !== "VALIDADO";
    if (aPendente !== bPendente) return aPendente ? -1 : 1;
    return b.diasEmAberto - a.diasEmAberto;
  });
}

/** Média de dias em rascunho por tipo — pra ver se algum tipo específico é sistematicamente mais lento. */
export async function calcularMediaDiasPorTipo(): Promise<{ tipo: string; mediaDias: number; quantidade: number }[]> {
  const linhas = await listarTempoDeCicloLevantamentos();
  const validados = linhas.filter((l) => l.status === "VALIDADO");

  const mapa = new Map<string, { soma: number; qtd: number }>();
  for (const l of validados) {
    const atual = mapa.get(l.tipo) ?? { soma: 0, qtd: 0 };
    atual.soma += l.diasEmAberto;
    atual.qtd += 1;
    mapa.set(l.tipo, atual);
  }

  return Array.from(mapa.entries()).map(([tipo, { soma, qtd }]) => ({
    tipo,
    mediaDias: qtd > 0 ? Math.round((soma / qtd) * 10) / 10 : 0,
    quantidade: qtd,
  }));
}

export interface LinhaTempoEntreMarcos {
  empreendimentoId: string;
  empreendimentoNome: string;
  tipologiaNome: string;
  materialCompletoEm: Date;
  producaoIniciadaEm: Date | null;
  diasUteis: number;
}

/**
 * Tempo entre "material completo" e "produção iniciada" — o exemplo
 * concreto que motivou o Marco Operacional: "chegou tal dia, quantos
 * dias úteis demorou pra iniciar a produção?"
 */
export async function listarTempoMaterialAteProducao(): Promise<LinhaTempoEntreMarcos[]> {
  const hoje = new Date();

  const marcosCompleto = await prisma.marcoOperacional.findMany({
    where: { etapa: "MATERIAL_COMPLETO" },
    include: { empreendimento: { select: { nome: true } }, tipologia: { select: { nome: true } } },
  });

  const resultado: LinhaTempoEntreMarcos[] = [];
  for (const marco of marcosCompleto) {
    if (!marco.tipologiaId) continue;
    const marcoProducao = await prisma.marcoOperacional.findFirst({
      where: { empreendimentoId: marco.empreendimentoId, tipologiaId: marco.tipologiaId, etapa: "PRODUCAO_INICIADA" },
      orderBy: { ocorridoEm: "asc" },
    });

    resultado.push({
      empreendimentoId: marco.empreendimentoId,
      empreendimentoNome: marco.empreendimento.nome,
      tipologiaNome: marco.tipologia?.nome ?? "—",
      materialCompletoEm: marco.ocorridoEm,
      producaoIniciadaEm: marcoProducao?.ocorridoEm ?? null,
      diasUteis: diasUteisEntre(marco.ocorridoEm, marcoProducao?.ocorridoEm ?? hoje),
    });
  }

  return resultado.sort((a, b) => b.diasUteis - a.diasUteis);
}
