export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { LevantamentoMateriaisPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-materiais-prisma-repository";

const repo = new LevantamentoMateriaisPrismaRepository();

export async function GET() {
  const fabricantes = await repo.listarFabricantes();
  return NextResponse.json(fabricantes);
}
