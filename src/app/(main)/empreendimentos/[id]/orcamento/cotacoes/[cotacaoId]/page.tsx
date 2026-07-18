export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/infra/db/prisma/client";
import { PageHeader } from "@/components/layout/page-header";
import {
  CotacaoDetailView,
  type CotacaoDetalhe,
} from "@/features/cotacoes/components/cotacao-detail-view";

interface Props {
  params: { id: string; cotacaoId: string };
}

export default async function CotacaoDetailPage({ params }: Props) {
  const cotacao = await prisma.cotacao.findUnique({
    where: { id: params.cotacaoId },
    include: {
      fornecedor: {
        select: {
          razaoSocial: true,
          nomeFantasia: true,
          cnpj: true,
        },
      },
      orcamento: {
        select: {
          empreendimento: {
            select: {
              id: true,
              nome: true,
              cidade: true,
              estado: true,
              cliente: {
                select: { razaoSocial: true, nomeFantasia: true },
              },
            },
          },
        },
      },
      itens: {
        orderBy: [{ ordem: "asc" }, { descricao: "asc" }],
      },
    },
  });

  if (!cotacao) notFound();
  if (cotacao.orcamento.empreendimento.id !== params.id) notFound();

  const obra = [cotacao.orcamento.empreendimento.cidade, cotacao.orcamento.empreendimento.estado]
    .filter(Boolean)
    .join(" - ");

  const detalhe: CotacaoDetalhe = {
    id: cotacao.id,
    numero: cotacao.numero,
    status: cotacao.status,
    fornecedor: {
      nomeExibido:
        cotacao.fornecedor.nomeFantasia ?? cotacao.fornecedor.razaoSocial,
      razaoSocial: cotacao.fornecedor.razaoSocial,
      cnpj: cotacao.fornecedor.cnpj,
    },
    empreendimento: {
      id: cotacao.orcamento.empreendimento.id,
      nome: cotacao.orcamento.empreendimento.nome,
      clienteNome:
        cotacao.orcamento.empreendimento.cliente.nomeFantasia ??
        cotacao.orcamento.empreendimento.cliente.razaoSocial,
      obra: obra || "—",
    },
    totalEletrica: Number(cotacao.totalEletrica ?? 0),
    totalQdc: Number(cotacao.totalQdc ?? 0),
    totalGeral: Number(cotacao.totalGeral ?? 0),
    observacoes: cotacao.observacoes,
    itensNaoCotaveis: cotacao.itensNaoCotaveis
      ? (JSON.parse(cotacao.itensNaoCotaveis) as CotacaoDetalhe["itensNaoCotaveis"])
      : [],
    itens: cotacao.itens.map((i) => ({
      id: i.id,
      descricao: i.descricao,
      fabricante: i.fabricante,
      unidade: i.unidade,
      kit: i.kit,
      quantidade: Number(i.quantidade),
      precoUnitario: Number(i.precoUnitario),
      total: Number(i.total),
      ordem: i.ordem,
    })),
    criadaEm: cotacao.createdAt,
    atualizadaEm: cotacao.updatedAt,
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/empreendimentos/${params.id}/orcamento`}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o Orçamento
      </Link>

      <PageHeader
        breadcrumb={[
          "Empreendimentos",
          detalhe.empreendimento.nome,
          "Orçamento",
          "Cotação",
        ]}
        title={`Cotação ${detalhe.numero}`}
        description={`Fornecedor: ${detalhe.fornecedor.nomeExibido}`}
      />

      <CotacaoDetailView cotacao={detalhe} />
    </div>
  );
}
