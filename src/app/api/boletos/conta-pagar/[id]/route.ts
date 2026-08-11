export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

const TIPOS_SEGUROS_INLINE = ["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await exigirPermissao(PERMISSOES.FINANCEIRO_VER);
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Não autorizado." }, { status: 401 });
  }

  const conta = await prisma.contaPagar.findUnique({
    where: { id: params.id },
    select: { boletoNome: true, boletoTipo: true, boletoConteudo: true },
  });

  if (!conta || !conta.boletoConteudo) {
    return NextResponse.json({ erro: "Boleto não encontrado." }, { status: 404 });
  }

  const tipo = conta.boletoTipo ?? "application/octet-stream";
  const disposicao = TIPOS_SEGUROS_INLINE.includes(tipo) ? "inline" : "attachment";

  return new NextResponse(new Uint8Array(conta.boletoConteudo), {
    headers: {
      "Content-Type": tipo,
      "Content-Disposition": `${disposicao}; filename="${conta.boletoNome}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
