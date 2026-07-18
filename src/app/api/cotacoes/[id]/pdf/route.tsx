export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import {
  CotacaoDocument,
  type CotacaoPdfData,
} from "@/features/cotacoes/lib/cotacao-pdf";

// Devolve o PDF da cotação com o layout QDC (planilha Pacaembu).
// O botão do frontend abre em nova aba com window.open, sem download automático.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_VER);
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "Não autorizado." },
      { status: 401 }
    );
  }

  const cotacao = await prisma.cotacao.findUnique({
    where: { id: params.id },
    include: {
      fornecedor: {
        select: { razaoSocial: true, nomeFantasia: true, cnpj: true },
      },
      orcamento: {
        select: {
          empreendimento: {
            select: {
              nome: true,
              cidade: true,
              estado: true,
              codigo: true,
              cliente: {
                select: { razaoSocial: true, nomeFantasia: true },
              },
            },
          },
        },
      },
      itens: { orderBy: [{ ordem: "asc" }, { descricao: "asc" }] },
    },
  });

  if (!cotacao) {
    return NextResponse.json({ erro: "Cotação não encontrada." }, { status: 404 });
  }

  const data: CotacaoPdfData = {
    numero: cotacao.numero,
    status: cotacao.status,
    clienteNome:
      cotacao.orcamento.empreendimento.cliente.nomeFantasia ??
      cotacao.orcamento.empreendimento.cliente.razaoSocial,
    empreendimentoNome: cotacao.orcamento.empreendimento.nome,
    empreendimentoCidade: cotacao.orcamento.empreendimento.cidade,
    empreendimentoEstado: cotacao.orcamento.empreendimento.estado,
    fornecedorNome:
      cotacao.fornecedor.nomeFantasia ?? cotacao.fornecedor.razaoSocial,
    fornecedorCnpj: cotacao.fornecedor.cnpj,
    dataEmissao: new Date(cotacao.createdAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    validadeAte: cotacao.validadeAte
      ? new Date(cotacao.validadeAte).toLocaleDateString("pt-BR")
      : null,
    totalEletrica: Number(cotacao.totalEletrica ?? 0),
    totalQdc: Number(cotacao.totalQdc ?? 0),
    totalGeral: Number(cotacao.totalGeral ?? 0),
    observacoes: cotacao.observacoes,
    itens: cotacao.itens.map((i) => ({
      descricao: i.descricao,
      fabricante: i.fabricante,
      unidade: i.unidade,
      kit: i.kit,
      quantidade: Number(i.quantidade),
      precoUnitario: Number(i.precoUnitario),
      total: Number(i.total),
      observacao: i.observacao,
    })),
  };

  const buffer = await renderToBuffer(<CotacaoDocument data={data} />);

  const nomeArquivo = `cotacao-${cotacao.numero}-${
    (cotacao.fornecedor.nomeFantasia ?? cotacao.fornecedor.razaoSocial)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
