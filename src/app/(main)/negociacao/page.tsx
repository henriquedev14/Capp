export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { prisma } from "@/infra/db/prisma/client";

/**
 * Hub global — lista todos os empreendimentos atualmente na etapa de
 * Negociação, pra não precisar entrar em cada um pra saber quem está
 * esperando decisão do cliente. Pedido pelo Henrique em 07/08/2026,
 * junto com a aba de Negociação por empreendimento.
 */
export default async function NegociacaoHubPage() {
  const podeVer = await temPermissao(PERMISSOES.ORCAMENTO_VER);
  if (!podeVer) redirect("/painel");

  const empreendimentos = await prisma.empreendimento.findMany({
    where: { excluidoEm: null, status: "NEGOCIACAO" },
    select: {
      id: true,
      nome: true,
      cidade: true,
      estado: true,
      updatedAt: true,
      cliente: { select: { razaoSocial: true, nomeFantasia: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Negociação"]}
        title="Negociação"
        description="Empreendimentos aguardando a decisão do cliente."
      />

      {empreendimentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Handshake className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum empreendimento em Negociação agora.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {empreendimentos.map((e) => {
            const dias = Math.floor((Date.now() - e.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
            return (
              <Link
                key={e.id}
                href={`/empreendimentos/${e.id}/negociacao`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-secondary/30"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{e.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.cliente.nomeFantasia ?? e.cliente.razaoSocial}
                    {(e.cidade || e.estado) && ` · ${[e.cidade, e.estado].filter(Boolean).join("/")}`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${dias > 7 ? "text-warning" : "text-muted-foreground"}`}>
                    {dias === 0 ? "hoje" : `há ${dias} dia${dias > 1 ? "s" : ""}`}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
