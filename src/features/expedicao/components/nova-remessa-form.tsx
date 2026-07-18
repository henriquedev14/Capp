"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  criarRemessaAction,
  buscarDadosParaNovaRemessaAction,
} from "@/features/expedicao/actions/expedicao-actions";

interface EmpreendimentoOpcao {
  id: string;
  codigo: string;
  nome: string;
}

interface EmpresaOpcao {
  id: string;
  nome: string;
}

interface LinhaItem {
  tipologiaId: string;
  tipologiaNome: string;
  tipoKit: "ELETRICO" | "HIDRAULICO" | "QDC";
  quantidadePrevista: number;
}

const LABEL_KIT: Record<string, string> = { ELETRICO: "Elétrico", HIDRAULICO: "Hidráulico", QDC: "QDC" };

export function NovaRemessaForm({
  empreendimentos,
  empresas,
}: {
  empreendimentos: EmpreendimentoOpcao[];
  empresas: EmpresaOpcao[];
}) {
  const router = useRouter();
  const [empresaId, setEmpresaId] = React.useState(empresas[0]?.id ?? "");
  const [empreendimentoId, setEmpreendimentoId] = React.useState("");
  const [carregandoDados, setCarregandoDados] = React.useState(false);
  const [clienteId, setClienteId] = React.useState<string | null>(null);
  const [clienteNome, setClienteNome] = React.useState<string | null>(null);
  const [enderecoEntrega, setEnderecoEntrega] = React.useState("");
  const [torres, setTorres] = React.useState<Array<{ id: string; nome: string }>>([]);
  const [torreId, setTorreId] = React.useState("");
  const [etapa, setEtapa] = React.useState("");
  const [origem, setOrigem] = React.useState("");
  const [dataSaidaPrevista, setDataSaidaPrevista] = React.useState("");
  const [tipologiasDisponiveis, setTipologiasDisponiveis] = React.useState<
    Array<{ id: string; nome: string; quantidadeUnidades: number }>
  >([]);
  const [kitsHabilitados, setKitsHabilitados] = React.useState<{ eletrico: boolean; hidraulico: boolean; qdc: boolean }>({
    eletrico: false,
    hidraulico: false,
    qdc: false,
  });
  const [itens, setItens] = React.useState<LinhaItem[]>([]);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function handleSelecionarEmpreendimento(id: string) {
    setEmpreendimentoId(id);
    setItens([]);
    if (!id) return;
    setCarregandoDados(true);
    try {
      const dados = await buscarDadosParaNovaRemessaAction(id);
      if (!dados) return;
      setClienteId(dados.clienteId);
      setClienteNome(dados.clienteNome);
      setEnderecoEntrega(dados.enderecoSugerido);
      setTorres(dados.torres);
      setTipologiasDisponiveis(dados.tipologias);
      setKitsHabilitados({
        eletrico: dados.kitEletrico,
        hidraulico: dados.kitHidraulico,
        qdc: dados.kitQdc,
      });
    } finally {
      setCarregandoDados(false);
    }
  }

  function adicionarLinha() {
    const primeiraTipologia = tipologiasDisponiveis[0];
    const primeiroKit: LinhaItem["tipoKit"] = kitsHabilitados.eletrico
      ? "ELETRICO"
      : kitsHabilitados.hidraulico
      ? "HIDRAULICO"
      : "QDC";
    if (!primeiraTipologia) return;
    setItens((prev) => [
      ...prev,
      {
        tipologiaId: primeiraTipologia.id,
        tipologiaNome: primeiraTipologia.nome,
        tipoKit: primeiroKit,
        quantidadePrevista: 1,
      },
    ]);
  }

  function atualizarLinha(i: number, patch: Partial<LinhaItem>) {
    setItens((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function removerLinha(i: number) {
    setItens((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSalvar() {
    setErro(null);
    if (!empresaId) return setErro("Selecione a empresa.");
    if (!empreendimentoId || !clienteId) return setErro("Selecione o empreendimento.");
    if (!enderecoEntrega.trim()) return setErro("Endereço de entrega é obrigatório.");
    if (itens.length === 0) return setErro("Adicione ao menos um item.");

    setSalvando(true);
    try {
      const resultado = await criarRemessaAction({
        empresaId,
        clienteId,
        empreendimentoId,
        origem: origem || undefined,
        torreId: torreId || undefined,
        etapa: etapa || undefined,
        enderecoEntrega,
        dataSaidaPrevista: dataSaidaPrevista || undefined,
        itens: itens.map((i) => ({
          tipologiaId: i.tipologiaId,
          tipologiaNome: i.tipologiaNome,
          tipoKit: i.tipoKit,
          descricao: `Kit ${LABEL_KIT[i.tipoKit]} — ${i.tipologiaNome}`,
          quantidadePrevista: i.quantidadePrevista,
        })),
      });
      if ("erro" in resultado) {
        setErro(resultado.erro);
        return;
      }
      router.push(`/expedicao/${resultado.id}`);
    } finally {
      setSalvando(false);
    }
  }

  const kitsOpcoes = [
    kitsHabilitados.eletrico && "ELETRICO",
    kitsHabilitados.hidraulico && "HIDRAULICO",
    kitsHabilitados.qdc && "QDC",
  ].filter(Boolean) as LinhaItem["tipoKit"][];

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">Dados da remessa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Empresa</label>
            <select
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Empreendimento</label>
            <select
              value={empreendimentoId}
              onChange={(e) => handleSelecionarEmpreendimento(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Selecione...</option>
              {empreendimentos.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.codigo} — {emp.nome}
                </option>
              ))}
            </select>
          </div>

          {clienteNome && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Cliente</label>
              <div className="flex h-9 items-center rounded-md border border-input bg-secondary/40 px-2 text-sm text-muted-foreground">
                {clienteNome}
              </div>
            </div>
          )}

          {torres.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Torre (opcional)</label>
              <select
                value={torreId}
                onChange={(e) => setTorreId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Nenhuma</option>
                {torres.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Endereço de entrega</label>
            <input
              type="text"
              value={enderecoEntrega}
              onChange={(e) => setEnderecoEntrega(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="Sugerido a partir do empreendimento — editável"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Etapa (opcional)</label>
            <input
              type="text"
              value={etapa}
              onChange={(e) => setEtapa(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="ex: Etapa 1"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Origem (opcional)</label>
            <input
              type="text"
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="ex: Fábrica Uberlândia"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Saída prevista (opcional)</label>
            <input
              type="date"
              value={dataSaidaPrevista}
              onChange={(e) => setDataSaidaPrevista(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {empreendimentoId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-border">
            <CardTitle className="text-[15px]">Itens da remessa</CardTitle>
            <Button size="sm" variant="outline" onClick={adicionarLinha} disabled={carregandoDados || tipologiasDisponiveis.length === 0}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar item
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-0 p-0">
            {itens.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum item adicionado ainda. Clique em "Adicionar item".
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {itens.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <select
                      value={item.tipologiaId}
                      onChange={(e) => {
                        const t = tipologiasDisponiveis.find((tp) => tp.id === e.target.value);
                        atualizarLinha(i, { tipologiaId: e.target.value, tipologiaNome: t?.nome ?? "" });
                      }}
                      className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {tipologiasDisponiveis.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome}
                        </option>
                      ))}
                    </select>
                    <select
                      value={item.tipoKit}
                      onChange={(e) => atualizarLinha(i, { tipoKit: e.target.value as LinhaItem["tipoKit"] })}
                      className="h-8 w-32 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {kitsOpcoes.map((k) => (
                        <option key={k} value={k}>
                          {LABEL_KIT[k]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={item.quantidadePrevista}
                      onChange={(e) => atualizarLinha(i, { quantidadePrevista: Number(e.target.value) || 1 })}
                      className="h-8 w-24 rounded-md border border-input bg-background px-2 text-right text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removerLinha(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={handleSalvar} disabled={salvando}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Criar remessa
        </Button>
        <Button variant="ghost" onClick={() => router.push("/expedicao")}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
