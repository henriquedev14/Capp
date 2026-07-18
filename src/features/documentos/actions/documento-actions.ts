"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { TimelinePrismaRepository } from "@/infra/db/prisma/repositories/timeline-prisma-repository";
import { verificarEmpreendimentoNaoArquivado } from "@/core/empreendimentos/use-cases/guarda-empreendimento-arquivado";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";

const timelineRepo = new TimelinePrismaRepository();

// Limite generoso o bastante pra plantas/fotos, mas protege o banco de
// arquivos gigantescos — sem infra de storage externo (S3), tudo fica
// salvo direto no Postgres como bytes. Bom para dezenas de MB; não é o
// lugar certo pra vídeos ou pastas de fotos enormes.
const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024; // 15MB

export interface DocumentoResumo {
  id: string;
  nome: string;
  tipo: string | null;
  tamanho: number | null;
  usuarioNome: string | null;
  criadoEm: Date;
}

interface Resultado {
  erro?: string;
  ok?: boolean;
  documentoId?: string;
}

export async function uploadDocumentoEmpreendimento(
  empreendimentoId: string,
  formData: FormData
): Promise<Resultado> {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) {
    return { erro: "Selecione um arquivo." };
  }

  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return {
      erro: `Arquivo muito grande (${(arquivo.size / 1024 / 1024).toFixed(1)}MB). Limite: 15MB.`,
    };
  }

  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: empreendimentoId },
    select: { id: true, excluidoEm: true },
  });
  const guardaArquivado = verificarEmpreendimentoNaoArquivado(empreendimento);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  const buffer = Buffer.from(await arquivo.arrayBuffer());

  const documento = await prisma.documentoEmpreendimento.create({
    data: {
      empreendimentoId,
      nome: arquivo.name,
      url: "",
      conteudo: new Uint8Array(buffer),
      tamanho: arquivo.size,
      tipo: arquivo.type || null,
      usuarioId: sessao.user.id,
    },
    select: { id: true },
  });

  await timelineRepo.criarEvento({
    empreendimentoId,
    tipo: "DOCUMENTO",
    titulo: `Documento anexado: ${arquivo.name}`,
    descricao: null,
    usuarioId: sessao.user.id,
    meta: JSON.stringify({ documentoId: documento.id }),
  });

  revalidatePath(`/empreendimentos/${empreendimentoId}`);
  return { ok: true, documentoId: documento.id };
}

export async function listarDocumentosEmpreendimento(
  empreendimentoId: string
): Promise<DocumentoResumo[]> {
  const docs = await prisma.documentoEmpreendimento.findMany({
    where: { empreendimentoId },
    select: {
      id: true,
      nome: true,
      tipo: true,
      tamanho: true,
      createdAt: true,
      usuario: { select: { nome: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return docs.map((d) => ({
    id: d.id,
    nome: d.nome,
    tipo: d.tipo,
    tamanho: d.tamanho,
    usuarioNome: d.usuario?.nome ?? null,
    criadoEm: d.createdAt,
  }));
}

export async function excluirDocumentoEmpreendimento(
  documentoId: string
): Promise<Resultado> {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não autorizado." };
  }

  const doc = await prisma.documentoEmpreendimento.findUnique({
    where: { id: documentoId },
    select: { empreendimentoId: true },
  });
  if (!doc) return { erro: "Documento não encontrado." };

  const guardaArquivado = await verificarEmpreendimentoAtivo(doc.empreendimentoId);
  if (!guardaArquivado.permitido) return { erro: guardaArquivado.motivo! };

  await prisma.documentoEmpreendimento.delete({ where: { id: documentoId } });

  revalidatePath(`/empreendimentos/${doc.empreendimentoId}`);
  return { ok: true };
}
