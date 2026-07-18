export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma/client";

export async function GET(req: NextRequest) {
  const busca = req.nextUrl.searchParams.get("q") ?? "";
  const fabricante = req.nextUrl.searchParams.get("fabricante");

  // Sem busca: lista os primeiros itens (opcionalmente filtrados por
  // fabricante) em vez de retornar vazio — o dialog não fica mais em
  // branco ao abrir, já mostra algo pra rolar.
  const resultados = await prisma.materialPex.findMany({
    where: {
      ativo: true,
      ...(fabricante && { fabricante }),
      ...(busca.length >= 2 && {
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          { diametro: { contains: busca, mode: "insensitive" } },
          { categoria: { contains: busca, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: [{ categoria: "asc" }, { nome: "asc" }, { diametro: "asc" }],
    take: busca.length >= 2 ? 40 : 60,
    select: { id: true, fabricante: true, categoria: true, nome: true, diametro: true, unidade: true },
  });

  return NextResponse.json(resultados);
}
