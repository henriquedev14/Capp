export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

// Devolve a cotação como CSV compatível com Excel PT-BR:
//  - separador ";" (Excel PT-BR interpreta "," como decimal, não delimitador)
//  - BOM UTF-8 no início pra Excel renderizar acentos corretamente
//  - números com "," decimal (nada de "3.5" — vira "3,50")
// Ordem das colunas espelha a planilha QDC Pacaembu:
//   FABRICANTE ; DESCRIÇÃO ; UND ; QTDE TOTAL ; VALOR UNIT. ; VALOR TOTAL ; KIT ; OBSERVAÇÃO

function escapeCSV(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Se contém ";", quebra de linha ou aspas, envolve em aspas duplas escapadas.
  if (/[";\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatNumeroBR(v: number, decimais = 2): string {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  });
}

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
      fornecedor: { select: { razaoSocial: true, nomeFantasia: true } },
      orcamento: {
        select: {
          empreendimento: {
            select: {
              nome: true,
              cliente: { select: { razaoSocial: true, nomeFantasia: true } },
            },
          },
        },
      },
      itens: { orderBy: [{ ordem: "asc" }] },
    },
  });

  if (!cotacao) {
    return NextResponse.json({ erro: "Cotação não encontrada." }, { status: 404 });
  }

  const fornecedorNome =
    cotacao.fornecedor.nomeFantasia ?? cotacao.fornecedor.razaoSocial;
  const clienteNome =
    cotacao.orcamento.empreendimento.cliente.nomeFantasia ??
    cotacao.orcamento.empreendimento.cliente.razaoSocial;

  const linhas: string[] = [];

  // Metadata no topo (facilita conferência)
  linhas.push(`# Cotação;${escapeCSV(cotacao.numero)}`);
  linhas.push(`# Fornecedor;${escapeCSV(fornecedorNome)}`);
  linhas.push(`# Cliente;${escapeCSV(clienteNome)}`);
  linhas.push(
    `# Obra;${escapeCSV(cotacao.orcamento.empreendimento.nome)}`
  );
  linhas.push(
    `# Emitida em;${escapeCSV(
      new Date(cotacao.createdAt).toLocaleDateString("pt-BR")
    )}`
  );
  linhas.push(""); // linha em branco separando metadados

  // Cabeçalho
  linhas.push(
    [
      "FABRICANTE",
      "DESCRIÇÃO",
      "UND",
      "QTDE TOTAL",
      "VALOR UNIT.",
      "VALOR TOTAL",
      "KIT",
      "OBSERVAÇÃO",
    ].join(";")
  );

  // Itens ordenados por fabricante e depois por ordem, pra imitar a planilha
  const itensOrdenados = [...cotacao.itens].sort((a, b) => {
    if (a.fabricante !== b.fabricante)
      return a.fabricante.localeCompare(b.fabricante);
    return a.ordem - b.ordem;
  });

  let fabricanteAtual = "";
  let subtotalGrupo = 0;

  for (const item of itensOrdenados) {
    // Ao trocar de fabricante, imprime subtotal do anterior (não do primeiro)
    if (item.fabricante !== fabricanteAtual) {
      if (fabricanteAtual !== "") {
        linhas.push(
          [
            "",
            `Subtotal ${fabricanteAtual}`,
            "",
            "",
            "",
            escapeCSV(formatNumeroBR(subtotalGrupo)),
            "",
            "",
          ].join(";")
        );
      }
      fabricanteAtual = item.fabricante;
      subtotalGrupo = 0;
    }

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
    subtotalGrupo += Number(item.total);
  }

  // Subtotal do último grupo
  if (fabricanteAtual !== "") {
    linhas.push(
      [
        "",
        `Subtotal ${fabricanteAtual}`,
        "",
        "",
        "",
        escapeCSV(formatNumeroBR(subtotalGrupo)),
        "",
        "",
      ].join(";")
    );
  }

  // Totais gerais
  linhas.push("");
  linhas.push(
    [
      "",
      "TOTAL ELÉTRICA",
      "",
      "",
      "",
      escapeCSV(formatNumeroBR(Number(cotacao.totalEletrica ?? 0))),
      "",
      "",
    ].join(";")
  );
  linhas.push(
    [
      "",
      "TOTAL P/ QDC",
      "",
      "",
      "",
      escapeCSV(formatNumeroBR(Number(cotacao.totalQdc ?? 0))),
      "",
      "",
    ].join(";")
  );
  linhas.push(
    [
      "",
      "TOTAL GERAL",
      "",
      "",
      "",
      escapeCSV(formatNumeroBR(Number(cotacao.totalGeral ?? 0))),
      "",
      "",
    ].join(";")
  );

  // BOM UTF-8 + CRLF (Excel PT-BR gosta)
  const conteudo = "\uFEFF" + linhas.join("\r\n") + "\r\n";
  const nomeArquivo = `cotacao-${cotacao.numero}-${fornecedorNome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.csv`;

  return new NextResponse(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
