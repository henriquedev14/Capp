import { prisma } from "@/infra/db/prisma/client";
import type {
  Orcamento,
  OrcamentoResumo,
  TabelaPrecoBase,
  TierMultiplicador,
  ItemServicoOrcamento,
  ItemMaterialOrcamento,
  OrcamentoJornadaEtapa,
  OrcamentoHistoricoEvento,
  EtapaJornada,
} from "@/core/orcamentacao/entities/orcamento";
import { jornadaInicial } from "@/core/orcamentacao/use-cases/jornada-orcamento";

// ---------------------------------------------------------------------------
// Helpers de conversão Decimal → number
// ---------------------------------------------------------------------------
function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "object" ? parseFloat(String(v)) : Number(v);
}
function toNumOpt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  return toNum(v);
}

// ---------------------------------------------------------------------------
// Repositório
// ---------------------------------------------------------------------------
export class OrcamentacaoPrismaRepository {
  // ── Tabelas de preço e tiers ─────────────────────────────────────────────

  async buscarTabelaPreco(): Promise<TabelaPrecoBase[]> {
    const rows = await prisma.tabelaPrecoBase.findMany({
      where: { ativo: true },
      orderBy: [{ kit: "asc" }, { areaMin: "asc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      kit: r.kit,
      criterio: r.criterio,
      areaMin: toNum(r.areaMin),
      areaMax: toNum(r.areaMax),
      descricao: r.descricao,
      precoBase: toNum(r.precoBase),
    }));
  }

  async buscarTiers(): Promise<TierMultiplicador[]> {
    const rows = await prisma.tierMultiplicador.findMany({
      orderBy: { tier: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      tier: r.tier,
      nome: r.nome,
      multiplicador: toNum(r.multiplicador),
      descricao: r.descricao,
    }));
  }

  /** Multiplicador do tier — retorna 1.0 se não encontrado. */
  async buscarMultiplicadorTier(tier: number): Promise<number> {
    const row = await prisma.tierMultiplicador.findUnique({ where: { tier } });
    return row ? toNum(row.multiplicador) : 1.0;
  }

  /**
   * Atualiza o preço base de uma faixa (kit + área). Editável pelo Admin
   * na tela de Configurações de Preço — antes só existia via seed/SQL.
   */
  async atualizarPrecoBase(id: string, precoBase: number): Promise<void> {
    await prisma.tabelaPrecoBase.update({ where: { id }, data: { precoBase } });
  }

  /** Atualiza o multiplicador (e opcionalmente o nome) de um tier. */
  async atualizarTierMultiplicador(
    id: string,
    data: { multiplicador: number; nome?: string }
  ): Promise<void> {
    await prisma.tierMultiplicador.update({
      where: { id },
      data: { multiplicador: data.multiplicador, ...(data.nome && { nome: data.nome }) },
    });
  }

  /** Preço base para um kit/área — retorna null se não configurado.
   * (Método legado, sem uso atual — calcularItensServico usa buscarTabelaPreco
   * + a lógica de faixa própria, que já suporta os dois critérios.) */
  async buscarPrecoBase(kit: string, areaM2: number): Promise<TabelaPrecoBase | null> {
    const row = await prisma.tabelaPrecoBase.findFirst({
      where: {
        kit,
        criterio: "AREA",
        ativo: true,
        areaMin: { lte: areaM2 },
        areaMax: { gt: areaM2 },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      kit: row.kit,
      criterio: row.criterio,
      areaMin: toNum(row.areaMin),
      areaMax: toNum(row.areaMax),
      descricao: row.descricao,
      precoBase: toNum(row.precoBase),
    };
  }

  // ── Orçamentos ───────────────────────────────────────────────────────────

  async listarPorEmpreendimento(empreendimentoId: string): Promise<OrcamentoResumo[]> {
    const rows = await prisma.orcamento.findMany({
      where: { empreendimentoId },
      orderBy: { revisao: "desc" },
      include: { responsavel: { select: { nome: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      revisao: r.revisao,
      status: r.status as Orcamento["status"],
      tier: r.tier,
      totalServicosHgi: toNumOpt(r.totalServicosHgi),
      totalMateriais: toNumOpt(r.totalMateriais),
      materiaisConferidos: r.materiaisConferidos,
      responsavelId: r.responsavelId,
      responsavelNome: r.responsavel?.nome ?? null,
      dataPrazo: r.dataPrazo,
      statusAprovacao: r.statusAprovacao as Orcamento["statusAprovacao"],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async buscarPorId(id: string): Promise<Orcamento | null> {
    const r = await prisma.orcamento.findUnique({
      where: { id },
      include: {
        itensServico: { orderBy: { createdAt: "asc" } },
        itensMaterial: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!r) return null;
    return toDomain(r);
  }

  /** Próxima revisão para este empreendimento */
  async proximaRevisao(empreendimentoId: string): Promise<number> {
    const ultimo = await prisma.orcamento.findFirst({
      where: { empreendimentoId },
      orderBy: { revisao: "desc" },
      select: { revisao: true },
    });
    return (ultimo?.revisao ?? 0) + 1;
  }

  async criar(data: {
    empreendimentoId: string;
    revisao: number;
    tier: number;
    observacoes?: string | null;
    criadoPorId?: string | null;
    itensServico: Array<Omit<ItemServicoOrcamento, "id" | "orcamentoId" | "situacao" | "justificativa" | "tierMultiplicadorId" | "ajusteManual" | "ajusteMotivo" | "memoriaCalculo">>;
    itensMaterial: Array<Omit<ItemMaterialOrcamento, "id" | "orcamentoId" | "situacao" | "justificativa" | "fornecedorSelecionadoId" | "cotacaoItemId" | "itemTabelaPrecoId" | "marca" | "precoBase" | "frete" | "impostos" | "perdas" | "memoriaCalculo">>;
  }): Promise<Orcamento> {
    // Calcula totais
    const totalServicosHgi = data.itensServico.reduce((s, i) => s + i.total, 0);
    const totalMateriais = data.itensMaterial.reduce(
      (s, i) => s + (i.total ?? 0),
      0
    );

    const r = await prisma.orcamento.create({
      data: {
        empreendimentoId: data.empreendimentoId,
        revisao: data.revisao,
        tier: data.tier,
        observacoes: data.observacoes,
        criadoPorId: data.criadoPorId,
        totalServicosHgi,
        totalMateriais,
        itensServico: {
          createMany: {
            data: data.itensServico.map((i) => ({
              tipologiaId: i.tipologiaId,
              tipologiaNome: i.tipologiaNome,
              kit: i.kit,
              quantidade: i.quantidade,
              precoBase: i.precoBase,
              multiplicador: i.multiplicador,
              precoUnitario: i.precoUnitario,
              total: i.total,
              pontos: i.pontos ?? null,
            })),
          },
        },
        itensMaterial: {
          createMany: {
            data: data.itensMaterial.map((i) => ({
              materialEletricoId: i.materialEletricoId ?? null,
              tipologiaNome: i.tipologiaNome,
              descricao: i.descricao,
              categoria: i.categoria ?? null,
              unidade: i.unidade,
              quantidade: i.quantidade,
              precoUnitario: i.precoUnitario,
              total: i.total,
            })),
          },
        },
      },
      include: {
        itensServico: { orderBy: { createdAt: "asc" } },
        itensMaterial: { orderBy: { createdAt: "asc" } },
      },
    });

    await this.criarJornadaInicial(r.id);

    return toDomain(r);
  }

  async atualizarStatus(
    id: string,
    status: Orcamento["status"]
  ): Promise<void> {
    await prisma.orcamento.update({ where: { id }, data: { status } });
  }

  async atualizarObservacoes(id: string, observacoes: string): Promise<void> {
    await prisma.orcamento.update({ where: { id }, data: { observacoes } });
  }

  async deletar(id: string): Promise<void> {
    await prisma.orcamento.delete({ where: { id } });
  }

  // ── Bloco 2 — Materiais ──────────────────────────────────────────────────

  async buscarCatalogoEletrico(busca?: string, fabricante?: string) {
    return prisma.materialEletrico.findMany({
      where: {
        ativo: true,
        ...(fabricante && { fabricante }),
        ...(busca && busca.length >= 2 && {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            { categoria: { contains: busca, mode: "insensitive" } },
            { especificacao: { contains: busca, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: [{ fabricante: "asc" }, { categoria: "asc" }, { nome: "asc" }],
      take: busca && busca.length >= 2 ? 40 : 60,
      select: { id: true, fabricante: true, categoria: true, nome: true, especificacao: true, unidade: true },
    });
  }

  async buscarFabricantesEletrico(): Promise<string[]> {
    const rows = await prisma.materialEletrico.findMany({
      where: { ativo: true },
      distinct: ["fabricante"],
      select: { fabricante: true },
      orderBy: { fabricante: "asc" },
    });
    return rows.map((r) => r.fabricante);
  }

  async adicionarItemMaterial(
    orcamentoId: string,
    item: {
      materialEletricoId?: string | null;
      descricao: string;
      categoria?: string | null;
      unidade: string;
      quantidade: number;
      precoUnitario?: number | null;
    }
  ): Promise<void> {
    const total = item.precoUnitario != null ? item.precoUnitario * item.quantidade : null;
    await prisma.itemMaterialOrcamento.create({
      data: {
        orcamentoId,
        materialEletricoId: item.materialEletricoId ?? null,
        descricao: item.descricao,
        categoria: item.categoria ?? null,
        unidade: item.unidade,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario ?? null,
        total,
      },
    });
    await this.recalcularTotalMateriais(orcamentoId);
  }

  async removerItemMaterial(itemId: string, orcamentoId: string): Promise<void> {
    await prisma.itemMaterialOrcamento.delete({ where: { id: itemId } });
    await this.recalcularTotalMateriais(orcamentoId);
  }

  async marcarMateriaisConferidos(orcamentoId: string, conferido: boolean): Promise<void> {
    await prisma.orcamento.update({
      where: { id: orcamentoId },
      data: { materiaisConferidos: conferido },
    });
  }

  async recalcularTotalMateriais(orcamentoId: string): Promise<void> {
    const itens = await prisma.itemMaterialOrcamento.findMany({
      where: { orcamentoId },
      select: { total: true },
    });
    const totalMateriais = itens.reduce((acc, i) => acc + toNum(i.total ?? 0), 0);
    await prisma.orcamento.update({
      where: { id: orcamentoId },
      data: { totalMateriais },
    });
  }

  // ── Jornada ──────────────────────────────────────────────────────────────

  /** Cria os registros de jornada (uma linha por etapa) para um orçamento novo. */
  async criarJornadaInicial(orcamentoId: string): Promise<void> {
    const etapas = jornadaInicial(orcamentoId);
    await prisma.orcamentoJornada.createMany({
      data: etapas.map((e) => ({
        orcamentoId: e.orcamentoId,
        etapa: e.etapa,
        status: e.status,
        dataInicio: e.status === "EM_ANDAMENTO" ? new Date() : null,
      })),
      skipDuplicates: true,
    });
  }

  async buscarJornada(orcamentoId: string): Promise<OrcamentoJornadaEtapa[]> {
    const rows = await prisma.orcamentoJornada.findMany({
      where: { orcamentoId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      orcamentoId: r.orcamentoId,
      etapa: r.etapa as EtapaJornada,
      status: r.status as OrcamentoJornadaEtapa["status"],
      responsavelId: r.responsavelId,
      dataInicio: r.dataInicio,
      dataPrevista: r.dataPrevista,
      dataConclusao: r.dataConclusao,
      motivoBloqueio: r.motivoBloqueio,
      pendencias: r.pendencias,
    }));
  }

  async atualizarEtapaJornada(
    orcamentoId: string,
    etapa: EtapaJornada,
    data: {
      status?: OrcamentoJornadaEtapa["status"];
      responsavelId?: string | null;
      dataPrevista?: Date | null;
      motivoBloqueio?: string | null;
    }
  ): Promise<void> {
    const atual = await prisma.orcamentoJornada.findUnique({
      where: { orcamentoId_etapa: { orcamentoId, etapa } },
    });

    const dataConclusao =
      data.status === "CONCLUIDA" || data.status === "APROVADA"
        ? new Date()
        : atual?.dataConclusao ?? null;

    await prisma.orcamentoJornada.upsert({
      where: { orcamentoId_etapa: { orcamentoId, etapa } },
      create: {
        orcamentoId,
        etapa,
        status: data.status ?? "EM_ANDAMENTO",
        responsavelId: data.responsavelId ?? null,
        dataPrevista: data.dataPrevista ?? null,
        motivoBloqueio: data.motivoBloqueio ?? null,
        dataInicio: new Date(),
        dataConclusao,
      },
      update: {
        ...(data.status && { status: data.status }),
        ...(data.responsavelId !== undefined && { responsavelId: data.responsavelId }),
        ...(data.dataPrevista !== undefined && { dataPrevista: data.dataPrevista }),
        ...(data.motivoBloqueio !== undefined && { motivoBloqueio: data.motivoBloqueio }),
        dataConclusao,
      },
    });
  }

  /** Avança para a próxima etapa da jornada, marcando a atual como concluída. */
  async avancarJornada(orcamentoId: string, etapaAtual: EtapaJornada, proximaEtapa: EtapaJornada): Promise<void> {
    await prisma.$transaction([
      prisma.orcamentoJornada.updateMany({
        where: { orcamentoId, etapa: etapaAtual },
        data: { status: "CONCLUIDA", dataConclusao: new Date() },
      }),
      prisma.orcamentoJornada.updateMany({
        where: { orcamentoId, etapa: proximaEtapa },
        data: { status: "EM_ANDAMENTO", dataInicio: new Date() },
      }),
    ]);
  }

  // ── Histórico / Auditoria ────────────────────────────────────────────────

  async registrarHistorico(data: {
    orcamentoId: string;
    tipoAlteracao: string;
    recursoTipo?: string | null;
    recursoId?: string | null;
    valorAnterior?: unknown;
    valorNovo?: unknown;
    justificativa?: string | null;
    registradoPorId: string;
  }): Promise<void> {
    await prisma.orcamentoHistorico.create({
      data: {
        orcamentoId: data.orcamentoId,
        tipoAlteracao: data.tipoAlteracao,
        recursoTipo: data.recursoTipo ?? null,
        recursoId: data.recursoId ?? null,
        valorAnterior: data.valorAnterior != null ? JSON.stringify(data.valorAnterior) : null,
        valorNovo: data.valorNovo != null ? JSON.stringify(data.valorNovo) : null,
        justificativa: data.justificativa ?? null,
        registradoPorId: data.registradoPorId,
      },
    });
  }

  async buscarHistorico(orcamentoId: string, limite = 50): Promise<OrcamentoHistoricoEvento[]> {
    const rows = await prisma.orcamentoHistorico.findMany({
      where: { orcamentoId },
      include: { registradoPor: { select: { nome: true } } },
      orderBy: { createdAt: "desc" },
      take: limite,
    });
    return rows.map((r) => ({
      id: r.id,
      orcamentoId: r.orcamentoId,
      tipoAlteracao: r.tipoAlteracao,
      recursoTipo: r.recursoTipo,
      recursoId: r.recursoId,
      valorAnterior: r.valorAnterior,
      valorNovo: r.valorNovo,
      justificativa: r.justificativa,
      registradoPorId: r.registradoPorId,
      registradoPorNome: r.registradoPor?.nome,
      createdAt: r.createdAt,
    }));
  }

  // ── Responsável, prazo e aprovação ──────────────────────────────────────

  async atualizarResponsavelPrazo(
    orcamentoId: string,
    data: { responsavelId?: string | null; dataPrazo?: Date | null }
  ): Promise<void> {
    await prisma.orcamento.update({
      where: { id: orcamentoId },
      data: {
        ...(data.responsavelId !== undefined && { responsavelId: data.responsavelId }),
        ...(data.dataPrazo !== undefined && { dataPrazo: data.dataPrazo }),
      },
    });
  }

  async enviarParaAprovacao(orcamentoId: string): Promise<void> {
    await prisma.orcamento.update({
      where: { id: orcamentoId },
      data: {
        status: "ENVIADO_APROVACAO_GESTOR",
        statusAprovacao: "AGUARDANDO_APROVACAO",
        motivoDevolucao: null,
      },
    });
  }

  async aprovarOrcamento(orcamentoId: string, aprovadoPorId: string): Promise<void> {
    await prisma.orcamento.update({
      where: { id: orcamentoId },
      data: {
        status: "ORCAMENTO_APROVADO",
        statusAprovacao: "APROVADO",
        aprovadoPorId,
        dataAprovacao: new Date(),
        motivoDevolucao: null,
      },
    });
  }

  async devolverOrcamento(orcamentoId: string, motivo: string): Promise<void> {
    await prisma.orcamento.update({
      where: { id: orcamentoId },
      data: {
        status: "ORCAMENTO_DEVOLVIDO",
        statusAprovacao: "DEVOLVIDO",
        motivoDevolucao: motivo,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// toDomain
// ---------------------------------------------------------------------------
function toDomain(r: {
  id: string;
  empreendimentoId: string;
  revisao: number;
  status: string;
  tier: number;
  totalServicosHgi: unknown;
  totalMateriais: unknown;
  materiaisConferidos: boolean;
  observacoes: string | null;
  criadoPorId: string | null;
  responsavelId?: string | null;
  dataPrazo?: Date | null;
  custoDireto?: unknown;
  custoIndireto?: unknown;
  margemPrevista?: unknown;
  statusAprovacao?: string;
  aprovadoPorId?: string | null;
  dataAprovacao?: Date | null;
  motivoDevolucao?: string | null;
  createdAt: Date;
  updatedAt: Date;
  itensServico: Array<{
    id: string;
    orcamentoId: string;
    tipologiaId: string | null;
    tipologiaNome: string;
    kit: string;
    quantidade: number;
    precoBase: unknown;
    multiplicador: unknown;
    precoUnitario: unknown;
    total: unknown;
    pontos?: number | null;
    situacao?: string;
    justificativa?: string | null;
    tierMultiplicadorId?: string | null;
    ajusteManual?: unknown;
    ajusteMotivo?: string | null;
    memoriaCalculo?: string | null;
    createdAt: Date;
  }>;
  itensMaterial: Array<{
    id: string;
    orcamentoId: string;
    materialEletricoId: string | null;
    tipologiaNome: string | null;
    descricao: string;
    categoria: string | null;
    unidade: string;
    quantidade: unknown;
    precoUnitario: unknown;
    total: unknown;
    situacao?: string;
    justificativa?: string | null;
    fornecedorSelecionadoId?: string | null;
    cotacaoItemId?: string | null;
    itemTabelaPrecoId?: string | null;
    marca?: string | null;
    precoBase?: unknown;
    frete?: unknown;
    impostos?: unknown;
    perdas?: unknown;
    memoriaCalculo?: string | null;
    createdAt: Date;
  }>;
}): Orcamento {
  return {
    id: r.id,
    empreendimentoId: r.empreendimentoId,
    revisao: r.revisao,
    status: r.status as Orcamento["status"],
    tier: r.tier,
    totalServicosHgi: toNumOpt(r.totalServicosHgi),
    totalMateriais: toNumOpt(r.totalMateriais),
    materiaisConferidos: r.materiaisConferidos,
    observacoes: r.observacoes,
    criadoPorId: r.criadoPorId,
    responsavelId: r.responsavelId ?? null,
    dataPrazo: r.dataPrazo ?? null,
    custoDireto: toNumOpt(r.custoDireto),
    custoIndireto: toNumOpt(r.custoIndireto),
    margemPrevista: toNumOpt(r.margemPrevista),
    statusAprovacao: (r.statusAprovacao as Orcamento["statusAprovacao"]) ?? "NAO_ENVIADO",
    aprovadoPorId: r.aprovadoPorId ?? null,
    dataAprovacao: r.dataAprovacao ?? null,
    motivoDevolucao: r.motivoDevolucao ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    itensServico: r.itensServico.map(
      (i): ItemServicoOrcamento => ({
        id: i.id,
        orcamentoId: i.orcamentoId,
        tipologiaId: i.tipologiaId,
        tipologiaNome: i.tipologiaNome,
        kit: i.kit,
        quantidade: i.quantidade,
        precoBase: toNum(i.precoBase),
        multiplicador: toNum(i.multiplicador),
        precoUnitario: toNum(i.precoUnitario),
        total: toNum(i.total),
        pontos: i.pontos ?? null,
        situacao: (i.situacao as ItemServicoOrcamento["situacao"]) ?? "NORMAL",
        justificativa: i.justificativa ?? null,
        tierMultiplicadorId: i.tierMultiplicadorId ?? null,
        ajusteManual: toNumOpt(i.ajusteManual),
        ajusteMotivo: i.ajusteMotivo ?? null,
        memoriaCalculo: i.memoriaCalculo ?? null,
      })
    ),
    itensMaterial: r.itensMaterial.map(
      (i): ItemMaterialOrcamento => ({
        id: i.id,
        orcamentoId: i.orcamentoId,
        materialEletricoId: i.materialEletricoId,
        tipologiaNome: i.tipologiaNome,
        descricao: i.descricao,
        categoria: i.categoria,
        unidade: i.unidade,
        quantidade: toNum(i.quantidade),
        precoUnitario: toNumOpt(i.precoUnitario),
        total: toNumOpt(i.total),
        situacao: (i.situacao as ItemMaterialOrcamento["situacao"]) ?? "PENDENTE_PRECIFICACAO",
        justificativa: i.justificativa ?? null,
        fornecedorSelecionadoId: i.fornecedorSelecionadoId ?? null,
        cotacaoItemId: i.cotacaoItemId ?? null,
        itemTabelaPrecoId: i.itemTabelaPrecoId ?? null,
        marca: i.marca ?? null,
        precoBase: toNumOpt(i.precoBase),
        frete: toNum(i.frete ?? 0),
        impostos: toNum(i.impostos ?? 0),
        perdas: toNum(i.perdas ?? 0),
        memoriaCalculo: i.memoriaCalculo ?? null,
      })
    ),
  };
}
