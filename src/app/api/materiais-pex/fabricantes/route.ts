export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma/client";

export async function GET() {
  const rows = await prisma.materialPex.findMany({
    where: { ativo: true },
    distinct: ["fabricante"],
    select: { fabricante: true },
    orderBy: { fabricante: "asc" },
  });
  return NextResponse.json(rows.map((r) => r.fabricante));
}
