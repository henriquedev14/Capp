import type { EtapaJornada, OrcamentoJornadaEtapa, StatusEtapaJornada } from "@/core/orcamentacao/entities/orcamento";
import { ETAPAS_JORNADA } from "@/core/orcamentacao/entities/orcamento";
export interface DadosParaCalcularJornada {
  jornadaExistente: OrcamentoJornadaEtapa[];
  /** Resultado de verificarGateOrcamentacao — todas as tipologias com levantamento validado. */
  levantamentosOk: boolean;
  totalServicosHgi: number;
  totalItensMaterial: number;
  cotacoes: { status: string }[];
  statusOrcamento: "EM_LEVANTAMENTO" | "ENVIADO_APROVACAO_GESTOR" | "ORCAMENTO_APROVADO" | "ORCAMENTO_DEVOLVIDO";
  propostaGeradaEm: string | null;
}
/**
 * Calcula o status REAL de cada etapa da Jornada do Orçamento, a partir
 * do estado de verdade do sistema — em vez de depender só do que foi
 * escrito manualmente na tabela `orcamento_jornada` (que na prática só
 * era atualizada na Aprovação, deixando a barra sempre em "0%
 * concluído" mesmo com o trabalho todo feito).
 *
 * Achado #1 da investigação de fluxo ponta-a-ponta (28/07/2026).
 *
 * Preserva os campos manuais de cada etapa (responsável, prazo,
 * pendências) vindos do banco — só recalcula o campo `status`. Exceção:
 * se alguém marcou BLOQUEADA/CANCELADA manualmente, isso é respeitado
 * (não é algo que dá pra inferir automaticamente do estado do sistema).
 */
export function calcularJornadaReal(dados: DadosParaCalcularJornada): OrcamentoJornadaEtapa[] {
  const porEtapa = new Map(dados.jornadaExistente.map((j) => [j.etapa, j]));
  const temCotacaoAceita = dados.cotacoes.some((c) => c.status === "ACEITA");
  const temAlgumaCotacao = dados.cotacoes.length > 0;
  const statusCalculado: Record<EtapaJornada, StatusEtapaJornada> = {
    LEVANTAMENTOS: dados.levantamentosOk ? "CONCLUIDA" : "EM_ANDAMENTO",
    COMPOSICAO: dados.totalServicosHgi > 0 ? "CONCLUIDA" : "NAO_INICIADA",
    MATERIAIS:
      dados.totalItensMaterial > 0 ? "CONCLUIDA" : dados.levantamentosOk ? "EM_ANDAMENTO" : "NAO_INICIADA",
    COTACOES: temCotacaoAceita ? "CONCLUIDA" : temAlgumaCotacao ? "EM_ANDAMENTO" : "NAO_INICIADA",
    REVISAO:
      dados.statusOrcamento === "ORCAMENTO_DEVOLVIDO"
        ? "DEVOLVIDA"
        : dados.statusOrcamento === "EM_LEVANTAMENTO"
          ? "NAO_INICIADA"
          : "CONCLUIDA",
    APROVACAO:
      dados.statusOrcamento === "ORCAMENTO_APROVADO"
        ? "APROVADA"
        : dados.statusOrcamento === "ORCAMENTO_DEVOLVIDO"
          ? "DEVOLVIDA"
          : dados.statusOrcamento === "ENVIADO_APROVACAO_GESTOR"
            ? "EM_ANDAMENTO"
            : "NAO_INICIADA",
    PROPOSTA: dados.propostaGeradaEm ? "CONCLUIDA" : "NAO_INICIADA",
  };
  // Etapas manuais que representam decisão humana explícita — não dá
  // pra inferir do estado do sistema, então respeita o que já tinha.
  const RESPEITAR_MANUAL: StatusEtapaJornada[] = ["BLOQUEADA", "CANCELADA"];
  return ETAPAS_JORNADA.map((etapa) => {
    const existente = porEtapa.get(etapa);
    const statusManualExplicito =
      existente && RESPEITAR_MANUAL.includes(existente.status) ? existente.status : null;
    return {
      id: existente?.id ?? `calculado-${etapa}`,
      orcamentoId: existente?.orcamentoId ?? "",
      etapa,
      status: statusManualExplicito ?? statusCalculado[etapa],
      responsavelId: existente?.responsavelId ?? null,
      dataInicio: existente?.dataInicio ?? null,
      dataPrevista: existente?.dataPrevista ?? null,
      dataConclusao: existente?.dataConclusao ?? null,
      motivoBloqueio: existente?.motivoBloqueio ?? null,
      pendencias: existente?.pendencias ?? null,
    };
  });
}
