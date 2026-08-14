import { prisma } from "@/infra/db/prisma/client";
import { calcularVidaFinanceiraLegado } from "@/core/empreendimentos/use-cases/calcular-vida-financeira-legado";

export interface ContaReceberResumo {
  id: string;
  tipo: "ENTRADA" | "REMESSA";
  valor: number;
  recebido: boolean;
  recebidoEm: string | null;
  dataPrevista: string | null;
  pavimentoNome: string | null;
  temBoleto: boolean;
}

export interface ContratoResumo {
  numero: string;
  valorFinal: number;
  empresaGrupoNome: string;
  geradoEm: string;
}

export interface VidaFinanceira {
  origemLegado: boolean;
  contrato: ContratoResumo | null;
  contas: ContaReceberResumo[];

  // Empreendimento normal: totalContratado/totalRecebido/saldoAReceber.
  // Legado: os 5 campos abaixo, vindos da fonte correta (nunca soma de
  // ContaReceber pro "contratado"). Ver calcularVidaFinanceiraLegado.
  totalContratado: number;
  totalRecebido: number;
  saldoAReceber: number;

  legado: {
    faturadoHistoricoReal: number;
    previstoAReceberPosErp: number;
    saldoAFaturar: number;
  } | null;
}

/**
 * "Vida Financeira" — panorama de Contas a Receber de QUALQUER
 * empreendimento. Modelagem revisada com o Henrique em 13/08/2026:
 * pra Legado, "Contratado" vem do baseline (legadoValorContratado),
 * NUNCA da soma de Contas a Receber — esse fallback foi a causa do
 * "R$ 31.886,12" aparecendo errado. E "Faturado" não usa mais a
 * palavra pra descrever Contas a Receber que só são previsão — só o
 * histórico real conta como "Faturado"; o resto é rotulado como
 * "Previsto a receber" no painel.
 */
export async function buscarVidaFinanceira(empreendimentoId: string): Promise<VidaFinanceira | null> {
  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: {
      id: true,
      origemLegado: true,
      legadoValorContratado: true,
      legadoFaturadoHistorico: true,
      legadoRecebidoHistorico: true,
    },
  });
  if (!empreendimento) return null;

  const [contrato, contasRaw] = await Promise.all([
    prisma.contrato.findFirst({
      where: { empreendimentoId },
      include: { empresaGrupo: { select: { nome: true } } },
      orderBy: { geradoEm: "desc" },
    }),
    prisma.contaReceber.findMany({
      where: { empreendimentoId },
      include: {
        pavimento: {
          select: {
            nome: true,
            torre: { select: { nome: true } },
            bloco: { select: { nome: true, torre: { select: { nome: true } } } },
          },
        },
      },
      orderBy: [{ recebido: "asc" }, { dataPrevista: "asc" }],
    }),
  ]);

  const contas: ContaReceberResumo[] = contasRaw.map((c) => {
    let pavimentoNome: string | null = null;
    if (c.pavimento) {
      const torreNome = c.pavimento.torre?.nome ?? c.pavimento.bloco?.torre.nome ?? "";
      pavimentoNome = torreNome ? `${torreNome} — ${c.pavimento.nome}` : c.pavimento.nome;
    }
    return {
      id: c.id,
      tipo: c.tipo,
      valor: Number(c.valor),
      recebido: c.recebido,
      recebidoEm: c.recebidoEm ? c.recebidoEm.toISOString() : null,
      dataPrevista: c.dataPrevista ? c.dataPrevista.toISOString().slice(0, 10) : null,
      pavimentoNome,
      temBoleto: !!c.boletoNome,
    };
  });

  if (empreendimento.origemLegado) {
    const v = calcularVidaFinanceiraLegado({
      valorContratado: empreendimento.legadoValorContratado ? Number(empreendimento.legadoValorContratado) : null,
      faturadoHistorico: empreendimento.legadoFaturadoHistorico ? Number(empreendimento.legadoFaturadoHistorico) : null,
      recebidoHistorico: empreendimento.legadoRecebidoHistorico ? Number(empreendimento.legadoRecebidoHistorico) : null,
      contasReceber: contas.map((c) => ({ valor: c.valor, recebido: c.recebido })),
    });
    return {
      origemLegado: true,
      contrato: null,
      contas,
      totalContratado: v.valorContratado,
      totalRecebido: v.recebidoTotal,
      saldoAReceber: v.saldoAReceber,
      legado: {
        faturadoHistoricoReal: v.faturadoHistoricoReal,
        previstoAReceberPosErp: v.previstoAReceberPosErp,
        saldoAFaturar: v.saldoAFaturar,
      },
    };
  }

  // Empreendimento normal — comportamento inalterado.
  const totalContratado = contrato ? Number(contrato.valorFinal) : contas.reduce((s, c) => s + c.valor, 0);
  const totalRecebido = contas.filter((c) => c.recebido).reduce((s, c) => s + c.valor, 0);
  const saldoAReceber = contas.filter((c) => !c.recebido).reduce((s, c) => s + c.valor, 0);

  return {
    origemLegado: false,
    contrato: contrato
      ? {
          numero: contrato.numero,
          valorFinal: Number(contrato.valorFinal),
          empresaGrupoNome: contrato.empresaGrupo.nome,
          geradoEm: contrato.geradoEm.toISOString().slice(0, 10),
        }
      : null,
    contas,
    totalContratado,
    totalRecebido,
    saldoAReceber,
    legado: null,
  };
}
