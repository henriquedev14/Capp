"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserPlus,
  Loader2,
  AlertTriangle,
  MoreVertical,
  ClipboardList,
  Search,
} from "lucide-react";
import { tomarPropriedadeDaFila } from "@/features/empreendimentos/actions/fila-levantamento-actions";
import type { LinhaEngenharia, BadgeCategoria } from "@/features/orcamentacao/queries/fila-engenharia-unificada";

const CLASSE_BADGE: Record<BadgeCategoria, string> = {
  neutro: "bg-[#F1F3F5] text-[#5E6873]",
  azul: "bg-[#EAF2FF] text-[#2765D7]",
  laranja: "bg-[#FFF1DF] text-[#D87900]",
  roxo: "bg-[#F0EAFE] text-[#7351CD]",
  verde: "bg-[#E8F7ED] text-[#248447]",
  vermelho: "bg-[#FDECEC] text-[#DC3C42]",
};

const TOTAL_SEGMENTOS = 7;

/**
 * Pra onde "próxima ação" leva, de acordo com a etapa — corrigido em
 * 11/08/2026 (achado pelo Henrique: o texto não era clicável em
 * nenhuma etapa, travando o uso real da tela).
 */
function linkProximaAcao(l: LinhaEngenharia): string {
  if (l.etapaAtual === "LEVANTAMENTOS" || !l.temOrcamento) {
    return `/empreendimentos/${l.empreendimentoId}/levantamentos`;
  }
  return `/empreendimentos/${l.empreendimentoId}/orcamento`;
}

/**
 * Central de trabalho da Engenharia — redesenho v4 (10/08/2026),
 * seguindo referência visual enviada pelo Henrique (estilo
 * Linear/Monday). Azul pra progresso/etapa, laranja SÓ pra próxima
 * ação e botão principal — disciplina de cor pedida explicitamente.
 */
export function ListaEngenhariaUnificada({ linhas }: { linhas: LinhaEngenharia[] }) {
  const router = useRouter();
  const [processandoId, setProcessandoId] = React.useState<string | null>(null);
  const [selecionadoId, setSelecionadoId] = React.useState<string | null>(null);
  const [busca, setBusca] = React.useState("");
  const [filtroCliente, setFiltroCliente] = React.useState("");
  const [filtroResponsavel, setFiltroResponsavel] = React.useState("");
  const [filtroEtapa, setFiltroEtapa] = React.useState("");
  const [filtroStatus, setFiltroStatus] = React.useState("");
  const [filtroPrioridade, setFiltroPrioridade] = React.useState("");

  async function handleTomar(e: React.MouseEvent, empreendimentoId: string) {
    e.stopPropagation();
    setProcessandoId(empreendimentoId);
    try {
      const r = await tomarPropriedadeDaFila(empreendimentoId);
      if ("erro" in r) alert(r.erro);
      else router.refresh();
    } finally {
      setProcessandoId(null);
    }
  }

  // Opções de cada filtro são derivadas dos dados reais — nada de
  // lista fixa desatualizada. Corrigido em 11/08/2026 (filtros
  // existiam só visualmente, não faziam nada).
  const opcoesCliente = Array.from(new Set(linhas.map((l) => l.clienteNome))).sort();
  const opcoesResponsavel = Array.from(new Set(linhas.map((l) => l.responsavelNome).filter((v): v is string => !!v))).sort();
  const opcoesEtapa = Array.from(new Set(linhas.map((l) => l.etapaLabel))).sort();
  const opcoesStatus = Array.from(new Set(linhas.map((l) => l.statusBadgeTexto))).sort();

  const linhasFiltradas = linhas.filter((l) => {
    if (busca.trim()) {
      const alvo = busca.toLowerCase();
      if (!l.empreendimentoNome.toLowerCase().includes(alvo) && !l.clienteNome.toLowerCase().includes(alvo)) return false;
    }
    if (filtroCliente && l.clienteNome !== filtroCliente) return false;
    if (filtroResponsavel && l.responsavelNome !== filtroResponsavel) return false;
    if (filtroEtapa && l.etapaLabel !== filtroEtapa) return false;
    if (filtroStatus && l.statusBadgeTexto !== filtroStatus) return false;
    if (filtroPrioridade && l.prioridade !== filtroPrioridade) return false;
    return true;
  });

  return (
    <div className="overflow-hidden rounded-xl border border-[#E4E8EC] bg-white">
      {/* Toolbar */}
      <div className="border-b border-[#EDF0F2] p-4">
        <div className="mb-3.5 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9099A3]" />
            <input
              value={busca}
              onChange={(ev) => setBusca(ev.target.value)}
              placeholder="Buscar empreendimento..."
              className="h-10 w-full rounded-lg border border-[#DFE4E8] pl-9 pr-3 text-sm text-[#1F252D] outline-none placeholder:text-[#9099A3] focus:border-[#F57C20]/40"
            />
          </div>
          <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-[#E0E4E7] px-4 py-2 text-[13px] font-medium text-[#F57C20]">
            <ClipboardList className="h-3.5 w-3.5" />
            Lista
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <FiltroSelect label="Cliente" valor={filtroCliente} opcoes={opcoesCliente} onChange={setFiltroCliente} />
          <FiltroSelect
            label="Responsável"
            valor={filtroResponsavel}
            opcoes={opcoesResponsavel}
            onChange={setFiltroResponsavel}
          />
          <FiltroSelect label="Etapa atual" valor={filtroEtapa} opcoes={opcoesEtapa} onChange={setFiltroEtapa} />
          <FiltroSelect label="Status" valor={filtroStatus} opcoes={opcoesStatus} onChange={setFiltroStatus} />
          <select
            value={filtroPrioridade}
            onChange={(ev) => setFiltroPrioridade(ev.target.value)}
            className="h-9 w-full rounded-lg border border-[#DFE3E7] bg-white px-2.5 text-[12.5px] text-[#525C66]"
          >
            <option value="">Prioridade</option>
            <option value="normal">Normal</option>
            <option value="atencao">Atenção</option>
            <option value="critica">Crítica</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#FAFBFC]">
            <Th>Empreendimento</Th>
            <Th>Etapa atual</Th>
            <Th>Progresso</Th>
            <Th>Status</Th>
            <Th>Responsável</Th>
            <Th>Prazo</Th>
            <Th>Próxima ação</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {linhasFiltradas.map((l) => {
            const semResponsavel = !l.responsavelId;
            const selecionado = selecionadoId === l.empreendimentoId;
            return (
              <React.Fragment key={l.empreendimentoId}>
                <tr
                  onClick={() => setSelecionadoId(selecionado ? null : l.empreendimentoId)}
                  className={`cursor-pointer border-b border-[#EDF0F2] transition-colors hover:bg-[#FAFBFC] ${
                    selecionado ? "bg-[#FFF8F3]" : ""
                  }`}
                  style={selecionado ? { borderLeft: "3px solid #F57C20" } : undefined}
                >
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/empreendimentos/${l.empreendimentoId}`}
                      onClick={(ev) => ev.stopPropagation()}
                      className="block text-[14px] font-bold text-[#1F252D] hover:underline"
                    >
                      {l.empreendimentoNome}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-[#7E8892]">
                      {l.clienteNome}
                      {(l.cidade || l.estado) && (
                        <>
                          <br />
                          {[l.cidade, l.estado].filter(Boolean).join(" / ")}
                        </>
                      )}
                    </p>
                  </td>
                  <td className="px-3 py-3.5 text-[#3478F6] font-semibold text-[13px]">
                    {l.temOrcamento ? l.etapaLabel : "—"}
                    {l.etapaAtual === "LEVANTAMENTOS" && (
                      <p className="mt-0.5 text-[11px] font-normal text-[#89929B]">{l.levantamentoLabel}</p>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    <SegmentosProgresso indiceAtual={l.progressoIndice} temOrcamento={l.temOrcamento} />
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-block rounded-md px-2.5 py-1 text-[11px] font-semibold ${CLASSE_BADGE[l.statusBadgeCategoria]}`}
                    >
                      {l.statusBadgeTexto}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-[#3D444C]">{l.responsavelNome ?? "—"}</td>
                  <td className="px-3 py-3.5">
                    {l.atrasado ? (
                      <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#DC3C42]">
                        <AlertTriangle className="h-3 w-3" />
                        Atrasado há {l.diasSemAtualizacao}d
                      </span>
                    ) : (
                      <span className="text-[12.5px] text-[#5E6873]">
                        {l.diasSemAtualizacao === 0 ? "Hoje" : `há ${l.diasSemAtualizacao}d`}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    {semResponsavel ? (
                      <button
                        onClick={(ev) => handleTomar(ev, l.empreendimentoId)}
                        disabled={processandoId !== null}
                        className="flex items-center gap-1.5 rounded-lg border border-[#F5C68F] bg-[#FFF1DF] px-3 py-1.5 text-[12.5px] font-semibold text-[#D87900] hover:bg-[#FEE8CC]"
                      >
                        {processandoId === l.empreendimentoId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        Tomar propriedade
                      </button>
                    ) : (
                      <Link
                        href={linkProximaAcao(l)}
                        onClick={(ev) => ev.stopPropagation()}
                        className={`text-[13px] font-semibold hover:underline ${
                          l.proximaAcaoAcionavel ? "text-[#F57C20]" : "text-[#9099A3] pointer-events-none"
                        }`}
                      >
                        {l.proximaAcaoLabel}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <MoreVertical className="ml-auto h-4 w-4 text-[#B4B2AB]" />
                  </td>
                </tr>

                {selecionado && <PainelDetalhe linha={l} />}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {linhasFiltradas.length === 0 && (
        <div className="py-14 text-center text-sm text-[#9099A3]">Nenhum empreendimento encontrado.</div>
      )}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#6B747D]">
      {children}
    </th>
  );
}

function FiltroSelect({
  label,
  valor,
  opcoes,
  onChange,
}: {
  label: string;
  valor: string;
  opcoes: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={valor}
      onChange={(ev) => onChange(ev.target.value)}
      className="h-9 w-full rounded-lg border border-[#DFE3E7] bg-white px-2.5 text-[12.5px] text-[#525C66]"
    >
      <option value="">{label}</option>
      {opcoes.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function SegmentosProgresso({ indiceAtual, temOrcamento }: { indiceAtual: number; temOrcamento: boolean }) {
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: TOTAL_SEGMENTOS }).map((_, i) => (
        <span
          key={i}
          className="h-1 w-[18px] rounded-full"
          style={{ background: temOrcamento && i < indiceAtual ? "#3478F6" : temOrcamento && i === indiceAtual ? "#3478F6" : "#DCE1E5" }}
        />
      ))}
    </div>
  );
}

function PainelDetalhe({ linha: l }: { linha: LinhaEngenharia }) {
  const ETAPAS_TECNICAS = [
    { chave: "documentos", label: "Documentos" },
    { chave: "analise", label: "Análise" },
    { chave: "levantamento", label: "Levantamento" },
    { chave: "materiais", label: "Materiais" },
    { chave: "orcamento", label: "Orçamento" },
    { chave: "aprovacao", label: "Aprovação" },
  ] as const;

  // Mapeia o índice real (0-6, sobre 7 etapas do orçamento) pro índice
  // dessa timeline técnica simplificada de 6 passos.
  const indiceTecnico = l.temOrcamento ? Math.min(l.progressoIndice, 5) : 0;

  return (
    <tr>
      <td colSpan={8} className="bg-[#FAFBFC] p-3.5">
        <div className="grid grid-cols-[1.1fr_2.7fr_1.3fr_1.6fr] gap-3">
          {/* Resumo */}
          <div className="rounded-[10px] border border-[#E5E9ED] bg-white p-4">
            <h3 className="mb-3.5 text-[14px] font-bold text-[#1F252D]">{l.empreendimentoNome}</h3>
            <InfoLinha label="Cliente" valor={l.clienteNome} />
            <InfoLinha label="Localização" valor={[l.cidade, l.estado].filter(Boolean).join(" / ") || "—"} />
            <InfoLinha label="Código" valor={l.empreendimentoCodigo} />
            <InfoLinha label="Responsável" valor={l.responsavelNome ?? "Sem responsável"} />
            <InfoLinha label="Última atualização" valor={l.diasSemAtualizacao === 0 ? "Hoje" : `há ${l.diasSemAtualizacao} dia(s)`} />
          </div>

          {/* Jornada técnica */}
          <div className="rounded-[10px] border border-[#E5E9ED] bg-white p-4">
            <h3 className="mb-3.5 text-[14px] font-bold text-[#1F252D]">Jornada técnica</h3>
            <div className="flex items-start justify-between">
              {ETAPAS_TECNICAS.map((et, i) => {
                const feita = i < indiceTecnico;
                const atual = i === indiceTecnico && l.temOrcamento;
                const bloqueada = atual && l.etapaStatus === "BLOQUEADA";
                return (
                  <div key={et.chave} className="relative flex flex-1 flex-col items-center text-center">
                    {i < ETAPAS_TECNICAS.length - 1 && (
                      <div className="absolute left-1/2 top-[15px] h-0.5 w-full bg-[#DFE4E8]" />
                    )}
                    <div
                      className="relative z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 text-[12px] font-bold"
                      style={
                        feita
                          ? { background: "#27A75E", borderColor: "#27A75E", color: "#fff" }
                          : bloqueada
                            ? { background: "#FDECEC", borderColor: "#DC3C42", color: "#DC3C42" }
                            : atual
                              ? { background: "#3478F6", borderColor: "#3478F6", color: "#fff", boxShadow: "0 0 0 4px #E5EFFF" }
                              : { background: "#F1F3F5", borderColor: "#D9DFE4", color: "#9099A3" }
                      }
                    >
                      {feita ? "✓" : bloqueada ? "!" : atual ? "●" : "🔒"}
                    </div>
                    <span className="mt-2 text-[10px] font-semibold text-[#1F252D]">{et.label}</span>
                    <span className="mt-0.5 text-[9px] text-[#89929B]">
                      {feita ? "Concluída" : bloqueada ? "Bloqueado" : atual ? "Em andamento" : "Bloqueado"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pendências */}
          <div className="rounded-[10px] border border-[#E5E9ED] bg-white p-4">
            <h3 className="mb-3.5 text-[14px] font-bold text-[#1F252D]">Pendências</h3>
            {l.pendencias.length === 0 ? (
              <p className="text-[11px] text-[#89929B]">Nenhuma pendência no momento.</p>
            ) : (
              l.pendencias.map((p, i) => (
                <div key={i} className="border-b border-[#EDF0F2] py-2 text-[11px] text-[#3D444C] last:border-0">
                  <span className="mr-1.5 text-[#F57C20]">⚠</span>
                  {p}
                </div>
              ))
            )}
          </div>

          {/* Próxima ação */}
          <div className="rounded-[10px] border border-[#E5E9ED] bg-white p-4">
            <h3 className="mb-3.5 text-[14px] font-bold text-[#1F252D]">Próxima ação</h3>
            <div className="rounded-[9px] border border-[#FFD9BF] bg-[#FFF7F1] p-3.5">
              <p className="mb-1 text-[13px] font-bold text-[#1F252D]">{l.proximaAcaoLabel}</p>
              {l.proximaAcaoDetalhe && <p className="text-[11px] text-[#7A838B]">{l.proximaAcaoDetalhe}</p>}
              {l.proximaAcaoAcionavel && (
                <Link
                  href={linkProximaAcao(l)}
                  className="mt-3 block w-full rounded-lg bg-[#F57C20] py-2.5 text-center text-[13px] font-semibold text-white hover:bg-[#DF6812]"
                >
                  {l.proximaAcaoLabel}
                </Link>
              )}
            </div>
            <div className="mt-3 text-[11px] text-[#69747E]">
              <p className="mb-1">Tempo na etapa: <b className="text-[#1F252D]">{l.diasSemAtualizacao} dia(s)</b></p>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function InfoLinha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="mb-2.5 text-[11px] text-[#69747E]">
      {label}: <span className="text-[#1F252D]">{valor}</span>
    </div>
  );
}
