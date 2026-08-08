export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

const LABELS_STATUS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  RESPONDIDA: "Respondida",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
};

function escapeCSV(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[";\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatNumeroBR(v: number, decimais = 2): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: decimais, maximumFractionDigits: decimais });
}

/**
 * CSV consolidado da Rodada INTEIRA — todos os fornecedores num
 * arquivo só, com um comparativo no topo. Antes só existia por
 * fornecedor individual. Fase 2 do redesenho de Negociação (07/08/2026).
 */
export async function GET(_req: NextRequest, { params }: { params: { rodadaId: string } }) {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_VER);
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Não autorizado." }, { status: 401 });
  }

  const rodada = await prisma.rodadaCotacao.findUnique({
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
  });

  if (!rodada) {
    return NextResponse.json({ erro: "Rodada não encontrada." }, { status: 404 });
  }

  const clienteNome =
    rodada.orcamento.empreendimento.cliente.nomeFantasia ?? rodada.orcamento.empreendimento.cliente.razaoSocial;

  const linhas: string[] = [];

  linhas.push(`# Cotação;${escapeCSV(rodada.numero)}`);
  linhas.push(`# Cliente;${escapeCSV(clienteNome)}`);
  linhas.push(`# Obra;${escapeCSV(rodada.orcamento.empreendimento.nome)}`);
  linhas.push(`# Emitida em;${escapeCSV(new Date(rodada.createdAt).toLocaleDateString("pt-BR"))}`);
  linhas.push("");

  // Comparativo entre fornecedores, primeiro — visão rápida de quem
  // cobrou quanto, sem precisar abrir cada seção.
  linhas.push("=== COMPARATIVO ENTRE FORNECEDORES ===");
  linhas.push(["FORNECEDOR", "STATUS", "TOTAL GERAL"].join(";"));
  for (const c of rodada.cotacoes) {
    const nome = c.fornecedor.nomeFantasia ?? c.fornecedor.razaoSocial;
    linhas.push([escapeCSV(nome), escapeCSV(LABELS_STATUS[c.status] ?? c.status), escapeCSV(formatNumeroBR(Number(c.totalGeral ?? 0)))].join(";"));
  }
  linhas.push("");

  // Detalhe item a item, uma seção por fornecedor.
  for (const c of rodada.cotacoes) {
    const nome = c.fornecedor.nomeFantasia ?? c.fornecedor.razaoSocial;
    linhas.push(`=== FORNECEDOR: ${nome} (${LABELS_STATUS[c.status] ?? c.status}) ===`);
    linhas.push(["FABRICANTE", "DESCRIÇÃO", "UND", "QTDE TOTAL", "VALOR UNIT.", "VALOR TOTAL", "KIT", "OBSERVAÇÃO"].join(";"));

    const itensOrdenados = [...c.itens].sort((a, b) => {
      if (a.fabricante !== b.fabricante) return a.fabricante.localeCompare(b.fabricante);
      return a.ordem - b.ordem;
    });

    for (const item of itensOrdenados) {
      linhas.push(
        [
          escapeCSV(item.fabricante),
          escapeCSV(item.descricao),
          escapeCSV(item.unidade),
          escapeCSV(formatNumeroBR(Number(item.quantidade))),
          escapeCSV(formatNumeroBR(Number(item.precoUnitario), 4)),
          escapeCSV(formatNumeroBR(Number(item.total))),
          escapeCSV(item.kit),
          escapeCSV(item.observacao ?? ""),
        ].join(";")
      );
    }
    linhas.push(["", `TOTAL ${nome}`, "", "", "", escapeCSV(formatNumeroBR(Number(c.totalGeral ?? 0))), "", ""].join(";"));
    linhas.push("");
  }

  const conteudo = "\uFEFF" + linhas.join("\r\n") + "\r\n";
  const nomeArquivo = `cotacao-${rodada.numero}-completa.csv`;

  return new NextResponse(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}

