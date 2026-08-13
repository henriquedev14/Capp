import { prisma } from "@/infra/db/prisma/client";

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
  contrato: ContratoResumo | null;
  contas: ContaReceberResumo[];
  totalContratado: number;
  totalRecebido: number;
  saldoAReceber: number;
}

/**
 * "Vida Financeira" — panorama de Contas a Receber e Contrato de
 * QUALQUER empreendimento (não só Modo Legado). Mesmo espírito da
 * "Vida da Produção": uma tela de leitura, o registro em si continua
 * sendo feito no financeiro normal. Pedido pelo Henrique em
 * 13/08/2026.
 */
export async function buscarVidaFinanceira(empreendimentoId: string): Promise<VidaFinanceira | null> {
  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: { id: true },
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

  const totalContratado = contrato ? Number(contrato.valorFinal) : contas.reduce((s, c) => s + c.valor, 0);
  const totalRecebido = contas.filter((c) => c.recebido).reduce((s, c) => s + c.valor, 0);
  const saldoAReceber = contas.filter((c) => !c.recebido).reduce((s, c) => s + c.valor, 0);

  return {
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
  };
}
