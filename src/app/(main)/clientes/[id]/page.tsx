export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Users, Building2, Boxes, ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/features/empreendimentos/components/status-badge";
import { TierBadge } from "@/features/tiers/components/tier-badge";
import { InativarClienteButton } from "@/features/clientes/components/inativar-cliente-button";
import { ClientePrismaRepository } from "@/infra/db/prisma/repositories/cliente-prisma-repository";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { cn } from "@/lib/utils";

const repo = new ClientePrismaRepository();
const empreendimentoRepo = new EmpreendimentoPrismaRepository();

function formatarCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export default async function ClienteDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const cliente = await repo.findById(params.id);
  if (!cliente) notFound();

  const empreendimentos = await empreendimentoRepo.findManyResumo({
    clienteId: params.id,
  });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/clientes"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Construtoras
      </Link>

      <div className="flex items-start justify-between gap-4">
        <PageHeader
          breadcrumb={["Clientes", cliente.nomeFantasia ?? cliente.razaoSocial]}
          title={cliente.nomeFantasia ?? cliente.razaoSocial}
          description={
            <span className="flex items-center gap-2">
              {cliente.nomeFantasia ? cliente.razaoSocial : undefined}
              <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                {cliente.codigo}
              </span>
            </span>
          }
        />
        <div className="flex items-center gap-2 shrink-0">
          <TierBadge tier={cliente.tier} fallback="sem-tier" size="md" />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              cliente.ativo
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", cliente.ativo ? "bg-success" : "bg-muted-foreground")} />
            {cliente.ativo ? "Ativa" : "Inativa"}
          </span>
          <Link href={`/clientes/${cliente.id}/editar`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </Link>
          <InativarClienteButton clienteId={cliente.id} ativo={cliente.ativo} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3 border-b border-border pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <Building2 className="h-[18px] w-[18px] text-accent-foreground" />
            </div>
            <CardTitle className="text-[15px]">Dados da construtora</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">CNPJ</p>
              <p className="text-sm font-medium tabular-nums">{formatarCnpj(cliente.cnpj)}</p>
            </div>
            {cliente.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${cliente.email}`} className="hover:text-primary transition-colors">
                  {cliente.email}
                </a>
              </div>
            )}
            {cliente.telefone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{cliente.telefone}</span>
              </div>
            )}
            {(cliente.logradouro ?? cliente.cidade) && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  {[cliente.logradouro, cliente.cidade, cliente.estado].filter(Boolean).join(", ")}
                  {cliente.cep && ` — CEP ${cliente.cep}`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3 border-b border-border pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <Users className="h-[18px] w-[18px] text-accent-foreground" />
            </div>
            <CardTitle className="text-[15px]">Contatos</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {cliente.contatos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {cliente.contatos.map((contato) => (
                  <div key={contato.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{contato.nome}</span>
                      {contato.principal && (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                          Principal
                        </span>
                      )}
                    </div>
                    {contato.cargo && (
                      <p className="text-xs text-muted-foreground mb-1">{contato.cargo}</p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {contato.telefone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {contato.telefone}
                        </span>
                      )}
                      {contato.email && (
                        <a
                          href={`mailto:${contato.email}`}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Mail className="h-3 w-3" />
                          {contato.email}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empreendimentos vinculados */}
      <Card>
        <CardHeader className="flex-row items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <Boxes className="h-[18px] w-[18px] text-accent-foreground" />
            </div>
            <CardTitle className="text-[15px]">
              Empreendimentos
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({empreendimentos.length})
              </span>
            </CardTitle>
          </div>
          <Link
            href={`/empreendimentos/novo`}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Novo empreendimento
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="pt-2">
          {empreendimentos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum empreendimento vinculado a esta construtora.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {empreendimentos.map((emp) => (
                <Link
                  key={emp.id}
                  href={`/empreendimentos/${emp.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 text-xs font-mono text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
                      {emp.codigo}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {emp.nome}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {emp.cidade} / {emp.estado}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={emp.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
