import { prisma } from "@/infra/db/prisma/client";
import type {
  LevantamentoMateriais,
  ItemLevantamentoMaterial,
  MaterialCatalogo,
} from "@/core/orcamentacao/entities/material-catalogo";

function toNum(v: unknown): number {
  return typeof v === "number" ? v : parseFloat(String(v));
}

function itemToDomain(i: {
  id: string;
  levantamentoId: string;
  materialEletricoId: string | null;
  fabricante: string;
  categoria: string | null;
  descricao: string;
  unidade: string;
  precoUnitario: unknown;
  quantidade: number;
  quantidadeUnitaria: number | null;
  repeticoes: number | null;
  createdAt: Date;
}): ItemLevantamentoMaterial {
  return {
    id: i.id,
    levantamentoId: i.levantamentoId,
    materialCatalogoId: i.materialEletricoId,
    fabricante: i.fabricante,
    categoria: i.categoria,
    descricao: i.descricao,
    unidade: i.unidade,
    precoUnitario: toNum(i.precoUnitario),
    quantidade: i.quantidade,
    quantidadeUnitaria: i.quantidadeUnitaria,
    repeticoes: i.repeticoes,
    createdAt: i.createdAt,
  };
}

const ITENS_INCLUDE = { itens: { orderBy: { createdAt: "asc" as const } } };

export class LevantamentoMateriaisPrismaRepository {
  // ── Catálogo (MaterialEletrico — compartilhado com o Bloco 2 do Orçamento) ──

  async buscarCatalogo(params?: { busca?: string; fabricante?: string; kit?: string }): Promise<MaterialCatalogo[]> {
    const rows = await prisma.materialEletrico.findMany({
      where: {
        ativo: true,
        ...(params?.fabricante && { fabricante: params.fabricante }),
        ...(params?.kit && { kit: params.kit }),
        ...(params?.busca && params.busca.length >= 2 && {
          OR: [
            { nome: { contains: params.busca, mode: "insensitive" } },
            { fabricante: { contains: params.busca, mode: "insensitive" } },
            { categoria: { contains: params.busca, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: [{ fabricante: "asc" }, { nome: "asc" }],
      take: params?.busca ? 60 : 100,
    });
    return rows.map((r) => ({
      id: r.id,
      fabricante: r.fabricante,
      categoria: r.categoria,
      descricao: r.nome,
      unidade: r.unidade,
      precoUnitario: toNum(r.precoUnitario),
      kit: r.kit as "ELETRICO" | "QDC",
      ativo: r.ativo,
    }));
  }

  async listarFabricantes(): Promise<string[]> {
    const rows = await prisma.materialEletrico.findMany({
      where: { ativo: true },
      distinct: ["fabricante"],
      select: { fabricante: true },
      orderBy: { fabricante: "asc" },
    });
    return rows.map((r) => r.fabricante);
  }

  /** Busca em lote por código — usado no casamento do upload da planilha de materiais. */
  async buscarPorCodigos(codigos: string[]): Promise<Map<string, MaterialCatalogo & { id: string }>> {
    if (codigos.length === 0) return new Map();
    const rows = await prisma.materialEletrico.findMany({
      where: { codigo: { in: codigos } },
    });
    const mapa = new Map<string, MaterialCatalogo & { id: string }>();
    for (const r of rows) {
      if (!r.codigo) continue;
      mapa.set(r.codigo, {
        id: r.id,
        fabricante: r.fabricante,
        categoria: r.categoria,
        descricao: r.nome,
        unidade: r.unidade,
        precoUnitario: toNum(r.precoUnitario),
        kit: r.kit as "ELETRICO" | "QDC",
        ativo: r.ativo,
      });
    }
    return mapa;
  }

  async atualizarPrecoCatalogo(id: string, precoUnitario: number): Promise<void> {
    await prisma.materialEletrico.update({ where: { id }, data: { precoUnitario } });
  }

  // ── Levantamento ──────────────────────────────────────────────────────────

  async buscar(empreendimentoId: string, tipologiaId: string): Promise<LevantamentoMateriais | null> {
    const r = await prisma.levantamentoMateriais.findUnique({
      where: { empreendimentoId_tipologiaId: { empreendimentoId, tipologiaId } },
      include: { tipologia: { select: { nome: true } }, ...ITENS_INCLUDE },
    });
    if (!r) return null;
    return {
      id: r.id,
      empreendimentoId: r.empreendimentoId,
      tipologiaId: r.tipologiaId,
      tipologiaNome: r.tipologia.nome,
      status: r.status as "RASCUNHO" | "VALIDADO",
      itens: r.itens.map(itemToDomain),
      criadoPorId: r.criadoPorId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async buscarTodosPorEmpreendimento(empreendimentoId: string): Promise<LevantamentoMateriais[]> {
    const rows = await prisma.levantamentoMateriais.findMany({
      where: { empreendimentoId },
      include: { tipologia: { select: { nome: true } }, ...ITENS_INCLUDE },
    });
    return rows.map((r) => ({
      id: r.id,
      empreendimentoId: r.empreendimentoId,
      tipologiaId: r.tipologiaId,
      tipologiaNome: r.tipologia.nome,
      status: r.status as "RASCUNHO" | "VALIDADO",
      itens: r.itens.map(itemToDomain),
      criadoPorId: r.criadoPorId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async criarOuBuscar(empreendimentoId: string, tipologiaId: string, usuarioId?: string): Promise<LevantamentoMateriais> {
    const existente = await this.buscar(empreendimentoId, tipologiaId);
    if (existente) return existente;

    const r = await prisma.levantamentoMateriais.create({
      data: { empreendimentoId, tipologiaId, criadoPorId: usuarioId },
      include: { tipologia: { select: { nome: true } }, ...ITENS_INCLUDE },
    });
    return {
      id: r.id,
      empreendimentoId: r.empreendimentoId,
      tipologiaId: r.tipologiaId,
      tipologiaNome: r.tipologia.nome,
      status: r.status as "RASCUNHO" | "VALIDADO",
      itens: [],
      criadoPorId: r.criadoPorId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async adicionarItem(
    levantamentoId: string,
    data: Omit<ItemLevantamentoMaterial, "id" | "levantamentoId" | "createdAt">
  ): Promise<ItemLevantamentoMaterial> {
    const i = await prisma.itemLevantamentoMaterial.create({
      data: {
        levantamentoId,
        materialEletricoId: data.materialCatalogoId ?? null,
        fabricante: data.fabricante,
        categoria: data.categoria ?? null,
        descricao: data.descricao,
        unidade: data.unidade,
        precoUnitario: data.precoUnitario,
        quantidade: data.quantidade,
        quantidadeUnitaria: data.quantidadeUnitaria ?? null,
        repeticoes: data.repeticoes ?? null,
      },
    });
    return itemToDomain(i);
  }

  /**
   * Substitui TODOS os itens de um levantamento pelos vindos do upload da
   * planilha — usado só pelo fluxo de upload (reenviar = recomeçar do
   * zero para aquela tipologia). Atômico: se a criação falhar no meio,
   * a exclusão desfaz junto (uma única transação).
   */
  async substituirItensPorUpload(
    levantamentoId: string,
    itens: Omit<ItemLevantamentoMaterial, "id" | "levantamentoId" | "createdAt">[]
  ): Promise<void> {
    await prisma.$transaction([
      prisma.itemLevantamentoMaterial.deleteMany({ where: { levantamentoId } }),
      prisma.itemLevantamentoMaterial.createMany({
        data: itens.map((data) => ({
          levantamentoId,
          materialEletricoId: data.materialCatalogoId ?? null,
          fabricante: data.fabricante,
          categoria: data.categoria ?? null,
          descricao: data.descricao,
          unidade: data.unidade,
          precoUnitario: data.precoUnitario,
          quantidade: data.quantidade,
          quantidadeUnitaria: data.quantidadeUnitaria ?? null,
          repeticoes: data.repeticoes ?? null,
        })),
      }),
    ]);
  }

  async excluirItem(id: string): Promise<void> {
    await prisma.itemLevantamentoMaterial.delete({ where: { id } });
  }

  async validar(id: string): Promise<void> {
    const levantamento = await prisma.levantamentoMateriais.update({
      where: { id },
      data: { status: "VALIDADO", validadoEm: new Date() },
    });
    await prisma.marcoOperacional.create({
      data: {
        empreendimentoId: levantamento.empreendimentoId,
        tipologiaId: levantamento.tipologiaId,
        etapa: "LEVANTAMENTO_MATERIAIS_VALIDADO",
      },
    });
  }

  async voltarParaRascunho(id: string): Promise<void> {
    await prisma.levantamentoMateriais.update({ where: { id }, data: { status: "RASCUNHO", validadoEm: null } });
  }
}
