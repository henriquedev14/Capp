export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wrench, Droplets, Package, Calculator } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { buscarStatusLevantamentos } from "@/features/empreendimentos/actions/empreendimento-actions";

// Hub unificado — substitui os 3 cards separados de "Levantamento X" na
// página do empreendimento. Mantém as URLs internas antigas
// (/levantamento, /levantamento-hidraulico, /levantamento-materiais) por
// compatibilidade: aqui é só um menu que aponta pra elas.

const empRepo = new EmpreendimentoPrismaRepository();

interface Props {
  params: { id: string };
}

export default async function LevantamentosHubPage({ params }: Props) {
  const empreendimento = await empRepo.findById(params.id);
  if (!empreendimento) notFound();

  const statusLevantamentos = await buscarStatusLevantamentos(params.id);

  const cards = [
    empreendimento.kitEletrico && {
      icone: Wrench,
      titulo: "Levantamento Elétrico",
      descricao: "Pontos de tomada, luz, comando",
      href: `/empreendimentos/${empreendimento.id}/levantamento`,
      status: statusLevantamentos.eletrico,
    },
    empreendimento.kitHidraulico && {
      icone: Droplets,
      titulo: "Levantamento Hidráulico",
      descricao: "Tubos PEX, água fria e quente",
      href: `/empreendimentos/${empreendimento.id}/levantamento-hidraulico`,
      status: statusLevantamentos.hidraulico,
    },
    empreendimento.kitEletrico && {
      icone: Package,
      titulo: "Levantamento de Materiais",
      descricao: "Catálogo elétrico — Wago, Tigre, Davin, TAF",
      href: `/empreendimentos/${empreendimento.id}/levantamento-materiais`,
      status: statusLevantamentos.materiais,
    },
  ].filter(Boolean) as Array<{
    icone: React.ComponentType<{ className?: string }>;
    titulo: string;
    descricao: string;
    href: string;
    status: "VALIDADO" | "EM_ANDAMENTO" | "NENHUM";
  }>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href={`/empreendimentos/${params.id}`}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para {empreendimento.nome}
        </Link>
        <Link
          href={`/empreendimentos/${params.id}/orcamento`}
          className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          <Calculator className="h-4 w-4" />
          Ir para Orçamento
        </Link>
      </div>

      <PageHeader
        breadcrumb={["Empreendimentos", empreendimento.nome, "Levantamentos"]}
        title="Levantamentos"
        description="Dimensionamento técnico do empreendimento — cada aba alimenta um bloco diferente do orçamento."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.titulo} href={c.href}>
            <Card className="h-full hover:border-primary/40 transition-colors">
              <CardContent className="flex h-full flex-col gap-3 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <c.icone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{c.titulo}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{c.descricao}</div>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                  Acessar →
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "VALIDADO" | "EM_ANDAMENTO" | "NENHUM" }) {
  const cfg = {
    VALIDADO: { label: "Concluído", classe: "bg-success/15 text-success" },
    EM_ANDAMENTO: { label: "Em andamento", classe: "bg-warning/15 text-warning" },
    NENHUM: { label: "Não iniciado", classe: "bg-muted text-muted-foreground" },
  }[status];
  return (
    <span
      className={
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold " + cfg.classe
      }
    >
      {cfg.label}
    </span>
  );
}
