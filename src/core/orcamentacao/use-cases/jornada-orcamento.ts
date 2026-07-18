import type {
  EtapaJornada,
  ItemMaterialOrcamento,
  ItemServicoOrcamento,
  OrcamentoJornadaEtapa,
} from "@/core/orcamentacao/entities/orcamento";
import { ETAPAS_JORNADA } from "@/core/orcamentacao/entities/orcamento";

/**
 * Lógica pura (sem I/O) de jornada e validações do Orçamento.
 * Mantida separada do repositório/actions para poder ser testada e
 * reutilizada tanto no server (actions) quanto, se necessário, no client
 * (cálculo otimista de UI) sem depender do Prisma.
 */

// ---------------------------------------------------------------------------
// Consistência — usado pelo checklist e pelo bloqueio de REVISAO → APROVACAO
// ---------------------------------------------------------------------------

export interface ProblemaConsistencia {
  codigo: string;
  descricao: string;
  recursoTipo: "ItemServicoOrcamento" | "ItemMaterialOrcamento" | "Orcamento";
  recursoId?: string;
}

/**
 * Verifica inconsistências matemáticas e de dados que impedem o
 * orçamento de avançar para Revisão/Aprovação.
 * Regra central do documento: nunca mostrar total zero sem explicação,
 * nunca deixar material sem preço sem motivo documentado.
 */
export function validarConsistenciaOrcamento(params: {
  itensServico: ItemServicoOrcamento[];
  itensMaterial: ItemMaterialOrcamento[];
  totalMateriaisArmazenado?: number | null;
}): ProblemaConsistencia[] {
  const problemas: ProblemaConsistencia[] = [];

  for (const item of params.itensServico) {
    if (item.quantidade > 0 && item.total === 0 && item.situacao === "NORMAL") {
      problemas.push({
        codigo: "SERVICO_TOTAL_ZERO_SEM_MOTIVO",
        descricao: `${item.tipologiaNome} (${item.kit}): total zero sem situação/justificativa registrada`,
        recursoTipo: "ItemServicoOrcamento",
        recursoId: item.id,
      });
    }
    if (item.situacao !== "NORMAL" && !item.justificativa) {
      problemas.push({
        codigo: "SERVICO_SITUACAO_SEM_JUSTIFICATIVA",
        descricao: `${item.tipologiaNome} (${item.kit}): situação "${item.situacao}" sem justificativa`,
        recursoTipo: "ItemServicoOrcamento",
        recursoId: item.id,
      });
    }
  }

  for (const item of params.itensMaterial) {
    const semPreco = item.precoUnitario === null || item.precoUnitario === undefined;
    if (item.quantidade > 0 && semPreco && item.situacao === "NORMAL") {
      problemas.push({
        codigo: "MATERIAL_SEM_PRECO_SEM_MOTIVO",
        descricao: `${item.descricao}: sem preço e sem situação documentada`,
        recursoTipo: "ItemMaterialOrcamento",
        recursoId: item.id,
      });
    }
    if (item.situacao !== "NORMAL" && item.situacao !== "PENDENTE_PRECIFICACAO" && !item.justificativa) {
      problemas.push({
        codigo: "MATERIAL_SITUACAO_SEM_JUSTIFICATIVA",
        descricao: `${item.descricao}: situação "${item.situacao}" sem justificativa`,
        recursoTipo: "ItemMaterialOrcamento",
        recursoId: item.id,
      });
    }
  }

  // Auditoria de totalização (se o total armazenado divergir da soma real)
  if (params.totalMateriaisArmazenado != null) {
    const somaCalculada = params.itensMaterial.reduce((acc, i) => acc + (i.total ?? 0), 0);
    if (Math.abs(params.totalMateriaisArmazenado - somaCalculada) > 1) {
      problemas.push({
        codigo: "TOTAL_MATERIAIS_DIVERGENTE",
        descricao: `Total de materiais armazenado (${params.totalMateriaisArmazenado.toFixed(2)}) diverge da soma dos itens (${somaCalculada.toFixed(2)})`,
        recursoTipo: "Orcamento",
      });
    }
  }

  return problemas;
}

// ---------------------------------------------------------------------------
// Checklist — usado pela tela de checklist antes de enviar para aprovação
// ---------------------------------------------------------------------------

export interface ChecklistSecao {
  titulo: string;
  ok: boolean;
  itens: Array<{ label: string; ok: boolean }>;
}

export function montarChecklistOrcamento(params: {
  itensServico: ItemServicoOrcamento[];
  itensMaterial: ItemMaterialOrcamento[];
  totalFornecedoresConsultados: number;
  totalFornecedoresRespondidos: number;
  cotacaoSelecionada: boolean;
  margemPrevista?: number | null;
  margemMeta?: number | null;
}): ChecklistSecao[] {
  const { itensServico, itensMaterial } = params;

  const tipologiasAnalisadas = new Set(itensServico.map((i) => i.tipologiaNome)).size;
  const tipologiasPrecificadas = itensServico.filter(
    (i) => i.total > 0 || i.situacao !== "NORMAL"
  ).length;

  const materiaisComPreco = itensMaterial.filter((i) => i.precoUnitario != null).length;
  const materiaisSemPreco = itensMaterial.length - materiaisComPreco;

  const composicao: ChecklistSecao = {
    titulo: "Composição",
    ok: itensServico.every((i) => i.total > 0 || i.situacao !== "NORMAL"),
    itens: [
      { label: `${tipologiasAnalisadas} tipologia(s) analisada(s)`, ok: tipologiasAnalisadas > 0 },
      {
        label: `${tipologiasPrecificadas} de ${itensServico.length} itens precificados ou justificados`,
        ok: tipologiasPrecificadas === itensServico.length,
      },
    ],
  };

  const materiais: ChecklistSecao = {
    titulo: "Materiais",
    ok: materiaisSemPreco === 0,
    itens: [
      { label: `${itensMaterial.length} item(ns) identificado(s)`, ok: itensMaterial.length > 0 },
      { label: `${materiaisComPreco} com preço`, ok: true },
      { label: `${materiaisSemPreco} sem preço`, ok: materiaisSemPreco === 0 },
    ],
  };

  const cotacoes: ChecklistSecao = {
    titulo: "Cotações",
    ok: params.cotacaoSelecionada,
    itens: [
      {
        label: `${params.totalFornecedoresConsultados} fornecedor(es) consultado(s)`,
        ok: params.totalFornecedoresConsultados > 0,
      },
      {
        label: `${params.totalFornecedoresRespondidos} responderam`,
        ok: params.totalFornecedoresRespondidos > 0,
      },
      { label: "Seleção confirmada", ok: params.cotacaoSelecionada },
    ],
  };

  const financeiro: ChecklistSecao = {
    titulo: "Financeiro",
    ok: params.margemMeta == null || (params.margemPrevista ?? 0) >= params.margemMeta,
    itens: [
      {
        label:
          params.margemPrevista != null
            ? `Margem prevista: ${params.margemPrevista.toFixed(1)}%`
            : "Margem ainda indisponível",
        ok: params.margemMeta == null || (params.margemPrevista ?? 0) >= params.margemMeta,
      },
    ],
  };

  return [composicao, materiais, cotacoes, financeiro];
}

// ---------------------------------------------------------------------------
// Bloqueios de transição de etapa
// ---------------------------------------------------------------------------

export interface ResultadoTransicao {
  permitido: boolean;
  motivo?: string;
}

/**
 * Verifica se é possível avançar de uma etapa para a próxima.
 * Usado pela UI para desabilitar botões com motivo explicado (Parte 4 do
 * documento de especificação: nenhum botão desabilitado sem explicação).
 */
export function podeAvancarEtapa(params: {
  etapaAtual: EtapaJornada;
  temLevantamentoValidado: boolean;
  itensServico: ItemServicoOrcamento[];
  itensMaterial: ItemMaterialOrcamento[];
  fornecedoresPendentesHaMuitoTempo: number;
  cotacaoSelecionada: boolean;
  totalMateriaisArmazenado?: number | null;
}): ResultadoTransicao {
  const {
    etapaAtual,
    temLevantamentoValidado,
    itensServico,
    itensMaterial,
    fornecedoresPendentesHaMuitoTempo,
    cotacaoSelecionada,
    totalMateriaisArmazenado,
  } = params;

  if (etapaAtual === "LEVANTAMENTOS" && !temLevantamentoValidado) {
    return { permitido: false, motivo: "Nenhum levantamento validado para este empreendimento." };
  }

  if (etapaAtual === "MATERIAIS") {
    const semPrecoSemMotivo = itensMaterial.filter(
      (i) => i.precoUnitario == null && i.situacao === "NORMAL"
    );
    if (semPrecoSemMotivo.length > 0) {
      return {
        permitido: false,
        motivo: `${semPrecoSemMotivo.length} material(is) sem preço e sem justificativa registrada.`,
      };
    }
  }

  if (etapaAtual === "COTACOES") {
    if (fornecedoresPendentesHaMuitoTempo > 0) {
      return {
        permitido: false,
        motivo: `${fornecedoresPendentesHaMuitoTempo} cotação(ões) aguardando resposta há mais de 14 dias.`,
      };
    }
    if (!cotacaoSelecionada && itensMaterial.length > 0) {
      return { permitido: false, motivo: "Nenhuma cotação foi selecionada ainda." };
    }
  }

  if (etapaAtual === "REVISAO") {
    const problemas = validarConsistenciaOrcamento({
      itensServico,
      itensMaterial,
      totalMateriaisArmazenado,
    });
    if (problemas.length > 0) {
      return {
        permitido: false,
        motivo: `${problemas.length} inconsistência(s) encontrada(s): ${problemas
          .slice(0, 3)
          .map((p) => p.descricao)
          .join("; ")}${problemas.length > 3 ? "..." : ""}`,
      };
    }
  }

  return { permitido: true };
}

// ---------------------------------------------------------------------------
// Estado inicial da jornada — usado ao criar um novo Orçamento
// ---------------------------------------------------------------------------

export function jornadaInicial(orcamentoId: string): Array<Pick<OrcamentoJornadaEtapa, "orcamentoId" | "etapa" | "status">> {
  return ETAPAS_JORNADA.map((etapa, idx) => ({
    orcamentoId,
    etapa,
    status: idx === 0 ? "EM_ANDAMENTO" : "NAO_INICIADA",
  }));
}

/** Índice da etapa na sequência — usado para calcular % de progresso. */
export function progressoJornada(etapasConcluidas: EtapaJornada[]): number {
  if (etapasConcluidas.length === 0) return 0;
  return Math.round((etapasConcluidas.length / ETAPAS_JORNADA.length) * 100);
}
