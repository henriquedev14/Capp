export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  FileUp,
  Mail,
  Phone,
  MapPin,
  Users,
  Truck,
  Tag,
  FileSpreadsheet,
  Package,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TipoBadge } from "@/features/fornecedores/components/tipo-badge";
import { GerenciarContatosFornecedor } from "@/features/fornecedores/components/gerenciar-contatos-fornecedor";
import { AtivarInativarFornecedorButton } from "@/features/fornecedores/components/ativar-inativar-fornecedor-button";
import { ProdutosFornecedorManager } from "@/features/fornecedores/components/produtos-fornecedor-manager";
import { FornecedorPrismaRepository } from "@/infra/db/prisma/repositories/fornecedor-prisma-repository";
import { prisma } from "@/infra/db/prisma/client";
import { cn } from "@/lib/utils";

const repo = new FornecedorPrismaRepository();

function formatarCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function formatarTelefone(tel: string): string {
  const d = tel.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, "($1) $2 $3-$4");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return tel;
}

export default async function FornecedorDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const fornecedor = await repo.findById(params.id);
  if (!fornecedor) notFound();

  // Produtos do catálogo elétrico que este fornecedor comercializa,
  // com o join do material carregado direto pra facilitar o render.
  // Blindado: se `db push` ainda não rodou depois de adicionar o model,
  // mostra 0 produtos + aviso em vez de derrubar a tela.
  let produtosFormatados: {
    id: string;
    precoUnitario: number;
    ativo: boolean;
    material: {
      id: string;
      fabricante: string;
      categoria: string;
      nome: string;
      especificacao: string | null;
      unidade: string;
      precoUnitario: number;
      kit: string;
    };
  }[] = [];
  let erroProdutos: string | null = null;
  try {
    const produtos = await prisma.produtoFornecedor.findMany({
      where: { fornecedorId: params.id },
      include: {
        materialEletrico: {
          select: {
            id: true,
            fabricante: true,
            categoria: true,
            nome: true,
            especificacao: true,
            unidade: true,
            precoUnitario: true,
            kit: true,
          },
        },
      },
      orderBy: [
        { materialEletrico: { fabricante: "asc" } },
        { materialEletrico: { nome: "asc" } },
      ],
    });
    produtosFormatados = produtos.map((p) => ({
      id: p.id,
      precoUnitario: Number(p.precoUnitario),
      ativo: p.ativo,
      material: {
        id: p.materialEletrico.id,
        fabricante: p.materialEletrico.fabricante,
        categoria: p.materialEletrico.categoria,
        nome: p.materialEletrico.nome,
        especificacao: p.materialEletrico.especificacao,
        unidade: p.materialEletrico.unidade,
        precoUnitario: Number(p.materialEletrico.precoUnitario),
        kit: p.materialEletrico.kit,
      },
    }));
  } catch (e) {
    erroProdutos =
      "Módulo de Produtos indisponível — rode `docker compose run --rm migrate npx prisma db push` para criar as tabelas.";
    console.error("[fornecedor/page] erro ao carregar produtos:", e);
  }

  const contatoPrincipal = fornecedor.contatos.find((c) => c.principal) ?? fornecedor.contatos[0];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/fornecedores"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Fornecedores
      </Link>

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          breadcrumb={["Fornecedores", fornecedor.nomeFantasia ?? fornecedor.razaoSocial]}
          title={fornecedor.nomeFantasia ?? fornecedor.razaoSocial}
          description={
            <span className="flex items-center gap-2 flex-wrap">
              {fornecedor.nomeFantasia ? (
                <span className="text-muted-foreground">{fornecedor.razaoSocial}</span>
              ) : null}
              <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                {fornecedor.codigo}
              </span>
            </span>
          }
        />
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              fornecedor.ativo
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                fornecedor.ativo ? "bg-success" : "bg-muted-foreground"
              )}
            />
            {fornecedor.ativo ? "Ativo" : "Inativo"}
          </span>
          <Link href={`/fornecedores/${fornecedor.id}/editar`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </Link>
          <Link href={`/fornecedores/${fornecedor.id}/importar-cotacao`}>
            <Button variant="outline" size="sm">
              <FileUp className="h-4 w-4" />
              Importar cotação (PDF)
            </Button>
          </Link>
          <Link href={`/fornecedores/${fornecedor.id}/importar-tabela-precos`}>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4" />
              Importar tabela de preços (PDF)
            </Button>
          </Link>
          <Link href={`/fornecedores/${fornecedor.id}/tabelas-de-preco`}>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4" />
              Tabela de Preços Padrão (.xlsx)
            </Button>
          </Link>
          <AtivarInativarFornecedorButton fornecedorId={fornecedor.id} ativo={fornecedor.ativo} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Informações gerais */}
          <Card>
            <CardHeader className="flex-row items-center gap-3 border-b border-border">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                <Truck className="h-[18px] w-[18px] text-accent-foreground" />
              </div>
              <CardTitle className="text-[15px]">Informações gerais</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">CNPJ</dt>
                  <dd className="font-mono font-medium">{formatarCnpj(fornecedor.cnpj)}</dd>
                </div>
                {fornecedor.email && (
                  <div>
                    <dt className="text-xs text-muted-foreground mb-1">E-mail</dt>
                    <dd>
                      <a
                        href={`mailto:${fornecedor.email}`}
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {fornecedor.email}
                      </a>
                    </dd>
                  </div>
                )}
                {fornecedor.telefone && (
                  <div>
                    <dt className="text-xs text-muted-foreground mb-1">Telefone</dt>
                    <dd>
                      <a
                        href={`tel:${fornecedor.telefone}`}
                        className="flex items-center gap-1.5 hover:text-primary transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {formatarTelefone(fornecedor.telefone)}
                      </a>
                    </dd>
                  </div>
                )}
                {(fornecedor.cidade || fornecedor.estado) && (
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-xs text-muted-foreground mb-1">Localização</dt>
                    <dd className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {[fornecedor.cidade, fornecedor.estado].filter(Boolean).join(" / ")}
                    </dd>
                  </div>
                )}
                {fornecedor.logradouro && (
                  <div className="col-span-2 sm:col-span-3">
                    <dt className="text-xs text-muted-foreground mb-1">Endereço</dt>
                    <dd className="text-muted-foreground">
                      {fornecedor.logradouro}
                      {fornecedor.cep ? ` — CEP ${fornecedor.cep}` : ""}
                    </dd>
                  </div>
                )}
                {fornecedor.observacoes && (
                  <div className="col-span-2 sm:col-span-3">
                    <dt className="text-xs text-muted-foreground mb-1">Observações</dt>
                    <dd className="whitespace-pre-wrap text-muted-foreground">
                      {fornecedor.observacoes}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Tipos de fornecimento */}
          <Card>
            <CardHeader className="flex-row items-center gap-3 border-b border-border">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                <Tag className="h-[18px] w-[18px] text-accent-foreground" />
              </div>
              <CardTitle className="text-[15px]">Tipos de fornecimento</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {fornecedor.tipos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum tipo cadastrado.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {fornecedor.tipos.map((tipo) => (
                    <TipoBadge key={tipo} tipo={tipo} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral — contatos e cotações */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-row items-center gap-3 border-b border-border">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                <Users className="h-[18px] w-[18px] text-accent-foreground" />
              </div>
              <CardTitle className="text-[15px]">
                Contatos ({fornecedor.contatos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <GerenciarContatosFornecedor
                fornecedorId={fornecedor.id}
                contatos={fornecedor.contatos.map((c) => ({ ...c, id: c.id as string }))}
              />
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader className="flex-row items-center gap-3 border-b border-border">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                <FileSpreadsheet className="h-[18px] w-[18px] text-muted-foreground" />
              </div>
              <CardTitle className="text-[15px]">Cotações</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">
                Nenhuma cotação registrada ainda.
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Em breve: histórico de cotações geradas pra este fornecedor.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Produtos e preços — full-width porque precisa de espaço pra tabela */}
      <Card>
        <CardHeader className="flex-row items-center gap-3 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
            <Package className="h-[18px] w-[18px] text-accent-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-[15px]">
              Produtos e Preços ({produtosFormatados.length})
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Lista de itens do catálogo elétrico com o preço aproximado deste fornecedor.
              Usada pra gerar cotações a partir do levantamento consolidado.
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {erroProdutos ? (
            <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm text-warning">
              {erroProdutos}
            </div>
          ) : (
            <ProdutosFornecedorManager
              fornecedorId={fornecedor.id}
              produtos={produtosFormatados}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
