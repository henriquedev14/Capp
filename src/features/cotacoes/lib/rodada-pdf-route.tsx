export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { RodadaPdfDocument, type RodadaPdfData } from "@/features/cotacoes/lib/rodada-pdf";

/**
 * PDF consolidado da Rodada inteira — página de comparativo + uma
 * página por fornecedor. Fase 2 do redesenho de Negociação (07/08/2026).
 */
export async function GET(_req: NextRequest, { params }: { params: { rodadaId: string } }) {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_VER);
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Não autorizado." }, { status: 401 });
  }

  const [rodada, config] = await Promise.all([
    prisma.rodadaCotacao.findUnique({
      where: { id: params.rodadaId },
      include: {
        orcamento: {
          select: {
            empreendimento: { select: { nome: true, cliente: { select: { razaoSocial: true, nomeFantasia: true } } } },
          },
        },
        cotacoes: {
          include: {
            fornecedor: { select: { razaoSocial: true, nomeFantasia: true } },
            itens: { orderBy: [{ ordem: "asc" }] },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.configuracaoSistema.findUnique({ where: { id: "default" }, select: { nomeEmpresaDocumentos: true } }),
  ]);

  if (!rodada) {
    return NextResponse.json({ erro: "Rodada não encontrada." }, { status: 404 });
  }

  const data: RodadaPdfData = {
    numero: rodada.numero,
    clienteNome:
      rodada.orcamento.empreendimento.cliente.nomeFantasia ?? rodada.orcamento.empreendimento.cliente.razaoSocial,
    empreendimentoNome: rodada.orcamento.empreendimento.nome,
    dataEmissao: new Date(rodada.createdAt).toLocaleDateString("pt-BR"),
    nomeEmissor: config?.nomeEmpresaDocumentos || "ConstruApp",
    fornecedores: rodada.cotacoes.map((c) => ({
      id: c.id,
      nome: c.fornecedor.nomeFantasia ?? c.fornecedor.razaoSocial,
      status: c.status,
      totalGeral: Number(c.totalGeral ?? 0),
      itens: c.itens.map((item) => ({
        id: item.id,
        fabricante: item.fabricante,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: Number(item.quantidade),
        precoUnitario: Number(item.precoUnitario),
        total: Number(item.total),
      })),
    })),
  };

  const buffer = await renderToBuffer(<RodadaPdfDocument data={data} />);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cotacao-${rodada.numero}-completa.pdf"`,
    },
  });
}
