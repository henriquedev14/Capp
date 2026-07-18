import { prisma } from "@/infra/db/prisma/client";
import { CIRCUITOS_PADRAO } from "@/core/empreendimentos/entities/circuitos-padrao";
import type {
  LevantamentoEletrico,
  PecaLevantamento,
  CircuitoPeca,
  CircuitoCatalogo,
} from "@/core/empreendimentos/entities/levantamento-eletrico";

type PrismaCircuitoPeca = {
  id: string;
  pecaId: string;
  catalogoId: string | null;
  bitola: number;
  circuito: number | null;
  temVermelho: boolean;
  temPreto: boolean;
  temAzul: boolean;
  temVerde: boolean;
  temAmarelo: boolean;
  temBranco: boolean;
  temCinza: boolean;
  identRetorno: string | null;
  ehParalelo: boolean;
  ehRetorno: boolean;
  sobraOverride: number | null;
  horizOverride: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaPecaLevantamento = {
  id: string;
  levantamentoId: string;
  numero: number;
  kit: "LAJE" | "VERTICAL" | "PISO";
  local: string | null;
  trecho: string;
  obs: string | null;
  vertical1: number;
  laje1: number;
  horiz: number;
  laje2: number;
  vertical2: number;
  diametro: string;
  sobra: number;
  circuitos: PrismaCircuitoPeca[];
  createdAt: Date;
  updatedAt: Date;
};

function circuitoToDomain(c: PrismaCircuitoPeca): CircuitoPeca {
  return {
    id: c.id,
    pecaId: c.pecaId,
    catalogoId: c.catalogoId,
    bitola: c.bitola,
    circuito: c.circuito,
    temVermelho: c.temVermelho,
    temPreto: c.temPreto,
    temAzul: c.temAzul,
    temVerde: c.temVerde,
    temAmarelo: c.temAmarelo,
    temBranco: c.temBranco,
    temCinza: c.temCinza,
    identRetorno: c.identRetorno,
    ehParalelo: c.ehParalelo,
    ehRetorno: c.ehRetorno,
    sobraOverride: c.sobraOverride,
    horizOverride: c.horizOverride,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function pecaToDomain(p: PrismaPecaLevantamento): PecaLevantamento {
  return {
    id: p.id,
    levantamentoId: p.levantamentoId,
    numero: p.numero,
    kit: p.kit,
    local: p.local,
    trecho: p.trecho,
    obs: p.obs,
    vertical1: p.vertical1,
    laje1: p.laje1,
    horiz: p.horiz,
    laje2: p.laje2,
    vertical2: p.vertical2,
    diametro: p.diametro,
    sobra: p.sobra,
    circuitos: p.circuitos.map(circuitoToDomain),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

const PECA_INCLUDE = {
  circuitos: { orderBy: { createdAt: "asc" as const } },
} as const;

export class LevantamentoPrismaRepository {
  // ── Catálogo de circuitos ──────────────────────────────────────────────────

  async buscarCatalogo(empreendimentoId: string): Promise<CircuitoCatalogo[]> {
    return prisma.circuitoCatalogo.findMany({
      where: { empreendimentoId },
      orderBy: { numero: "asc" },
    }) as Promise<CircuitoCatalogo[]>;
  }

  async iniciarCatalogoPadrao(empreendimentoId: string): Promise<void> {
    await prisma.circuitoCatalogo.createMany({
      data: CIRCUITOS_PADRAO.map((c) => ({ ...c, empreendimentoId })),
      skipDuplicates: true,
    });
  }

  async salvarCircuitoCatalogo(
    empreendimentoId: string,
    data: Omit<CircuitoCatalogo, "id" | "empreendimentoId" | "createdAt" | "updatedAt">
  ): Promise<CircuitoCatalogo> {
    return prisma.circuitoCatalogo.upsert({
      where: { empreendimentoId_numero: { empreendimentoId, numero: data.numero } },
      create: { ...data, empreendimentoId },
      update: data,
    }) as Promise<CircuitoCatalogo>;
  }

  async excluirCircuitoCatalogo(id: string): Promise<void> {
    await prisma.circuitoCatalogo.delete({ where: { id } });
  }

  // ── Levantamento ──────────────────────────────────────────────────────────

  async buscarPorTipologia(
    empreendimentoId: string,
    tipologiaId: string
  ): Promise<LevantamentoEletrico | null> {
    const r = await prisma.levantamentoEletrico.findUnique({
      where: { empreendimentoId_tipologiaId: { empreendimentoId, tipologiaId } },
      include: {
        tipologia: { select: { nome: true } },
        pecas: { include: PECA_INCLUDE, orderBy: { numero: "asc" } },
      },
    });
    if (!r) return null;
    return {
      id: r.id,
      empreendimentoId: r.empreendimentoId,
      tipologiaId: r.tipologiaId,
      tipologiaNome: r.tipologia.nome,
      status: r.status as "RASCUNHO" | "VALIDADO",
      revisao: r.revisao,
      observacoes: r.observacoes,
      peDireito: r.peDireito,
      totaisImportadosJson: r.totaisImportadosJson,
      pecas: r.pecas.map(pecaToDomain),
      criadoPorId: r.criadoPorId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async criarOuBuscar(
    empreendimentoId: string,
    tipologiaId: string,
    usuarioId?: string
  ): Promise<LevantamentoEletrico> {
    const existente = await this.buscarPorTipologia(empreendimentoId, tipologiaId);
    if (existente) return existente;

    // Inicia catálogo padrão se ainda não existe
    const totalCatalogo = await prisma.circuitoCatalogo.count({ where: { empreendimentoId } });
    if (totalCatalogo === 0) {
      await this.iniciarCatalogoPadrao(empreendimentoId);
    }

    const r = await prisma.levantamentoEletrico.create({
      data: { empreendimentoId, tipologiaId, criadoPorId: usuarioId },
      include: {
        tipologia: { select: { nome: true } },
        pecas: { include: PECA_INCLUDE, orderBy: { numero: "asc" } },
      },
    });

    return {
      id: r.id,
      empreendimentoId: r.empreendimentoId,
      tipologiaId: r.tipologiaId,
      tipologiaNome: r.tipologia.nome,
      status: r.status as "RASCUNHO" | "VALIDADO",
      revisao: r.revisao,
      observacoes: r.observacoes,
      peDireito: r.peDireito,
      totaisImportadosJson: r.totaisImportadosJson,
      pecas: [],
      criadoPorId: r.criadoPorId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  // ── Peças ─────────────────────────────────────────────────────────────────

  async adicionarPeca(
    levantamentoId: string,
    data: {
      numero: number;
      kit: "LAJE" | "VERTICAL" | "PISO";
      local?: string;
      trecho: string;
      obs?: string;
      vertical1?: number;
      laje1?: number;
      horiz?: number;
      laje2?: number;
      vertical2?: number;
      diametro?: string;
      sobra?: number;
    }
  ): Promise<PecaLevantamento> {
    const r = await prisma.pecaLevantamento.create({
      data: {
        levantamentoId,
        numero: data.numero,
        kit: data.kit,
        local: data.local,
        trecho: data.trecho,
        obs: data.obs,
        vertical1: data.vertical1 ?? 0,
        laje1: data.laje1 ?? 0,
        horiz: data.horiz ?? 0,
        laje2: data.laje2 ?? 0,
        vertical2: data.vertical2 ?? 0,
        diametro: data.diametro ?? '3/4"',
        sobra: data.sobra ?? 0.3,
      },
      include: PECA_INCLUDE,
    });
    return pecaToDomain(r);
  }

  async atualizarPeca(
    id: string,
    data: Partial<Omit<PecaLevantamento, "id" | "levantamentoId" | "circuitos" | "createdAt" | "updatedAt">>
  ): Promise<PecaLevantamento> {
    const r = await prisma.pecaLevantamento.update({
      where: { id },
      data,
      include: PECA_INCLUDE,
    });
    return pecaToDomain(r);
  }

  async excluirPeca(id: string): Promise<void> {
    await prisma.pecaLevantamento.delete({ where: { id } });
  }

  // ── Circuitos da peça ─────────────────────────────────────────────────────

  async adicionarCircuito(
    pecaId: string,
    data: Omit<CircuitoPeca, "id" | "pecaId" | "createdAt" | "updatedAt">
  ): Promise<CircuitoPeca> {
    const r = await prisma.circuitoPeca.create({ data: { ...data, pecaId } });
    return circuitoToDomain(r);
  }

  async atualizarCircuito(
    id: string,
    data: Partial<Omit<CircuitoPeca, "id" | "pecaId" | "createdAt" | "updatedAt">>
  ): Promise<CircuitoPeca> {
    const r = await prisma.circuitoPeca.update({ where: { id }, data });
    return circuitoToDomain(r);
  }

  async excluirCircuito(id: string): Promise<void> {
    await prisma.circuitoPeca.delete({ where: { id } });
  }

  // ── Status ─────────────────────────────────────────────────────────────────

  async validarLevantamento(id: string): Promise<void> {
    const levantamento = await prisma.levantamentoEletrico.update({
      where: { id },
      data: { status: "VALIDADO", validadoEm: new Date() },
    });
    await prisma.marcoOperacional.create({
      data: {
        empreendimentoId: levantamento.empreendimentoId,
        tipologiaId: levantamento.tipologiaId,
        etapa: "LEVANTAMENTO_ELETRICO_VALIDADO",
      },
    });
  }

  async voltarParaRascunho(id: string): Promise<void> {
    await prisma.levantamentoEletrico.update({
      where: { id },
      data: { status: "RASCUNHO", validadoEm: null },
    });
  }
}
