import { prisma } from "@/infra/db/prisma/client";
import type {
  LevantamentoHidraulico,
  ItemLevantamentoHidraulico,
  SubtipoHidraulico,
} from "@/core/empreendimentos/entities/levantamento-hidraulico";

const ITENS_INCLUDE = { itens: { orderBy: { createdAt: "asc" as const } } };

function toDomain(r: {
  id: string;
  empreendimentoId: string;
  tipologiaId: string;
  tipologia: { nome: string };
  subtipo: string;
  status: string;
  observacoes: string | null;
  criadoPorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  itens: {
    id: string;
    levantamentoId: string;
    materialPexId: string | null;
    descricao: string;
    categoria: string | null;
    diametro: string | null;
    unidade: string;
    quantidade: number;
    createdAt: Date;
  }[];
}): LevantamentoHidraulico {
  return {
    id: r.id,
    empreendimentoId: r.empreendimentoId,
    tipologiaId: r.tipologiaId,
    tipologiaNome: r.tipologia.nome,
    subtipo: r.subtipo as SubtipoHidraulico,
    status: r.status as "RASCUNHO" | "VALIDADO",
    observacoes: r.observacoes,
    criadoPorId: r.criadoPorId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    itens: r.itens.map((i) => ({
      id: i.id,
      levantamentoId: i.levantamentoId,
      materialPexId: i.materialPexId,
      descricao: i.descricao,
      categoria: i.categoria,
      diametro: i.diametro,
      unidade: i.unidade,
      quantidade: i.quantidade,
      createdAt: i.createdAt,
    })),
  };
}

export class LevantamentoHidraulicoPrismaRepository {
  async buscar(
    empreendimentoId: string,
    tipologiaId: string,
    subtipo: SubtipoHidraulico
  ): Promise<LevantamentoHidraulico | null> {
    const r = await prisma.levantamentoHidraulico.findUnique({
      where: {
        empreendimentoId_tipologiaId_subtipo: { empreendimentoId, tipologiaId, subtipo },
      },
      include: { tipologia: { select: { nome: true } }, ...ITENS_INCLUDE },
    });
    return r ? toDomain(r) : null;
  }

  async buscarTodosPorEmpreendimento(empreendimentoId: string): Promise<LevantamentoHidraulico[]> {
    const rs = await prisma.levantamentoHidraulico.findMany({
      where: { empreendimentoId },
      include: { tipologia: { select: { nome: true } }, ...ITENS_INCLUDE },
    });
    return rs.map(toDomain);
  }

  async criarOuBuscar(
    empreendimentoId: string,
    tipologiaId: string,
    subtipo: SubtipoHidraulico,
    usuarioId?: string
  ): Promise<LevantamentoHidraulico> {
    const existente = await this.buscar(empreendimentoId, tipologiaId, subtipo);
    if (existente) return existente;

    const r = await prisma.levantamentoHidraulico.create({
      data: { empreendimentoId, tipologiaId, subtipo, criadoPorId: usuarioId },
      include: { tipologia: { select: { nome: true } }, ...ITENS_INCLUDE },
    });
    return toDomain(r);
  }

  async adicionarItem(
    levantamentoId: string,
    data: Omit<ItemLevantamentoHidraulico, "id" | "levantamentoId" | "createdAt">
  ): Promise<ItemLevantamentoHidraulico> {
    const i = await prisma.itemLevantamentoHidraulico.create({
      data: { ...data, levantamentoId },
    });
    return {
      id: i.id,
      levantamentoId: i.levantamentoId,
      materialPexId: i.materialPexId,
      descricao: i.descricao,
      categoria: i.categoria,
      diametro: i.diametro,
      unidade: i.unidade,
      quantidade: i.quantidade,
      createdAt: i.createdAt,
    };
  }

  async excluirItem(id: string): Promise<void> {
    await prisma.itemLevantamentoHidraulico.delete({ where: { id } });
  }

  async validar(id: string): Promise<void> {
    const levantamento = await prisma.levantamentoHidraulico.update({
      where: { id },
      data: { status: "VALIDADO", validadoEm: new Date() },
    });
    await prisma.marcoOperacional.create({
      data: {
        empreendimentoId: levantamento.empreendimentoId,
        tipologiaId: levantamento.tipologiaId,
        etapa: "LEVANTAMENTO_HIDRAULICO_VALIDADO",
      },
    });
  }

  async voltarParaRascunho(id: string): Promise<void> {
    await prisma.levantamentoHidraulico.update({ where: { id }, data: { status: "RASCUNHO", validadoEm: null } });
  }
}
