export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { LevantamentoMateriaisPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-materiais-prisma-repository";

const repo = new LevantamentoMateriaisPrismaRepository();

export async function GET(req: NextRequest) {
  const busca = req.nextUrl.searchParams.get("q") ?? "";
  const fabricante = req.nextUrl.searchParams.get("fabricante") ?? undefined;
  const kit = req.nextUrl.searchParams.get("kit") ?? undefined;

  const resultados = await repo.buscarCatalogo({ busca, fabricante, kit });
  return NextResponse.json(resultados);
}
