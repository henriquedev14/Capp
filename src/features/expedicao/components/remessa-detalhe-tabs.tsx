"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Package, Truck as TruckIcon, History, LayoutList, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  registrarQuantidadeSeparadaAction,
  registrarQuantidadeConferidaAction,
  criarVolumeAction,
  vincularItemAoVolumeAction,
  criarCarregamentoAction,
  vincularVolumeAoCarregamentoAction,
  liberarCarregamentoAction,
  marcarComoCarregadoAction,
  registrarSaidaAction,
  cancelarCarregamentoAction,
} from "@/features/expedicao/actions/expedicao-actions";
import type { buscarRemessaDetalheAction } from "@/features/expedicao/actions/expedicao-actions";

type RemessaDetalhe = NonNullable<Awaited<ReturnType<typeof buscarRemessaDetalheAction>>>;

interface Props {
  remessa: RemessaDetalhe;
  historico: Array<{
    id: string;
    tipoEvento: string;
    statusAnterior: string | null;
    statusNovo: string;
    observacao: string | null;
    createdAt: Date;
    usuario: { nome: string };
    carregamentoId: string | null;
  }>;
  transportadoras: Array<{ id: string; nome: string }>;
  motoristas: Array<{ id: string; nome: string; transportadora: { nome: string } | null }>;
  veiculos: Array<{ id: string; placa: string; modelo: string | null; transportadora: { nome: string } | null }>;
}

const TABS = [
  { value: "resumo", label: "Resumo", icon: LayoutList },
  { value: "itens", label: "Itens", icon: ClipboardList },
  { value: "volumes", label: "Volumes", icon: Package },
  { value: "carregamentos", label: "Carregamentos", icon: TruckIcon },
  { value: "historico", label: "Histórico", icon: History },
] as const;

function saldoDisponivel(item: { quantidadeConferida: number; quantidadeAlocada: number; quantidadeExpedida: number }) {
  return item.quantidadeConferida - item.quantidadeAlocada - item.quantidadeExpedida;
}

export function RemessaDetalheTabs({ remessa, historico, transportadoras, motoristas, veiculos }: Props) {
  const router = useRouter();
  const [aba, setAba] = React.useState<(typeof TABS)[number]["value"]>("resumo");
  const [erro, setErro] = React.useState<string | null>(null);
  const [processando, setProcessando] = React.useState<string | null>(null);

  async function executar(chave: string, fn: () => Promise<{ erro?: string } | { ok: true } | unknown>) {
    setErro(null);
    setProcessando(chave);
    try {
      const resultado = await fn();
      if (resultado && typeof resultado === "object" && "erro" in resultado && resultado.erro) {
        setErro(resultado.erro as string);
        return;
      }
      router.refresh();
    } finally {
      setProcessando(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setAba(t.value)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              aba === t.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}

      {aba === "resumo" && <AbaResumo remessa={remessa} />}
      {aba === "itens" && (
        <AbaItens remessa={remessa} processando={processando} executar={executar} />
      )}
      {aba === "volumes" && (
        <AbaVolumes remessa={remessa} processando={processando} executar={executar} />
      )}
      {aba === "carregamentos" && (
        <AbaCarregamentos
          remessa={remessa}
          transportadoras={transportadoras}
          motoristas={motoristas}
          veiculos={veiculos}
          processando={processando}
          executar={executar}
        />
      )}
      {aba === "historico" && <AbaHistorico historico={historico} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------

function AbaResumo({ remessa }: { remessa: RemessaDetalhe }) {
  const totalPrevisto = remessa.itens.reduce((a, i) => a + i.quantidadePrevista, 0);
  const totalExpedido = remessa.itens.reduce((a, i) => a + i.quantidadeExpedida, 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <span className="text-xs text-muted-foreground">Cliente</span>
          <span className="text-sm font-medium text-foreground">
            {remessa.cliente.nomeFantasia ?? remessa.cliente.razaoSocial}
          </span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <span className="text-xs text-muted-foreground">Endereço de entrega</span>
          <span className="text-sm font-medium text-foreground">{remessa.enderecoEntrega}</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <span className="text-xs text-muted-foreground">Empresa</span>
          <span className="text-sm font-medium text-foreground">{remessa.empresa.nome}</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <span className="text-xs text-muted-foreground">Criado por</span>
          <span className="text-sm font-medium text-foreground">{remessa.criadoPor.nome}</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <span className="text-xs text-muted-foreground">Total previsto / expedido</span>
          <span className="text-sm font-medium text-foreground">
            {totalExpedido} / {totalPrevisto}
          </span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <span className="text-xs text-muted-foreground">Volumes / Carregamentos</span>
          <span className="text-sm font-medium text-foreground">
            {remessa.volumes.length} / {remessa.carregamentos.length}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------

function AbaItens({
  remessa,
  processando,
  executar,
}: {
  remessa: RemessaDetalhe;
  processando: string | null;
  executar: (chave: string, fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [valores, setValores] = React.useState<Record<string, { separada: number; conferida: number }>>({});

  function valorAtual(item: RemessaDetalhe["itens"][number]) {
    return valores[item.id] ?? { separada: item.quantidadeSeparada, conferida: item.quantidadeConferida };
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium text-right">Prevista</th>
                <th className="px-4 py-3 font-medium text-right">Separada</th>
                <th className="px-4 py-3 font-medium text-right">Conferida</th>
                <th className="px-4 py-3 font-medium text-right">Alocada</th>
                <th className="px-4 py-3 font-medium text-right">Carregada</th>
                <th className="px-4 py-3 font-medium text-right">Expedida</th>
                <th className="px-4 py-3 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {remessa.itens.map((item) => {
                const v = valorAtual(item);
                const saldo = saldoDisponivel(item);
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-foreground">{item.descricao}</div>
                      <div className="text-xs text-muted-foreground">{item.status}</div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{item.quantidadePrevista}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        max={item.quantidadePrevista}
                        value={v.separada}
                        onChange={(e) =>
                          setValores((prev) => ({ ...prev, [item.id]: { ...v, separada: Number(e.target.value) } }))
                        }
                        onBlur={() =>
                          executar(`sep-${item.id}`, () => registrarQuantidadeSeparadaAction(item.id, v.separada))
                        }
                        className="h-7 w-16 rounded border border-input bg-background px-1 text-right text-xs"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        max={item.quantidadeSeparada}
                        value={v.conferida}
                        onChange={(e) =>
                          setValores((prev) => ({ ...prev, [item.id]: { ...v, conferida: Number(e.target.value) } }))
                        }
                        onBlur={() =>
                          executar(`conf-${item.id}`, () => registrarQuantidadeConferidaAction(item.id, v.conferida))
                        }
                        className="h-7 w-16 rounded border border-input bg-background px-1 text-right text-xs"
                      />
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{item.quantidadeAlocada}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{item.quantidadeCarregada}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{item.quantidadeExpedida}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums text-foreground">{saldo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Volumes
// ---------------------------------------------------------------------------

const TIPOS_VOLUME = ["CAIXA", "PALETE", "FEIXE", "AVULSO", "KIT", "OUTRO"] as const;

function AbaVolumes({
  remessa,
  processando,
  executar,
}: {
  remessa: RemessaDetalhe;
  processando: string | null;
  executar: (chave: string, fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [novoTipo, setNovoTipo] = React.useState<(typeof TIPOS_VOLUME)[number]>("CAIXA");
  const [selecaoItem, setSelecaoItem] = React.useState<Record<string, { itemId: string; quantidade: number }>>({});

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <select
          value={novoTipo}
          onChange={(e) => setNovoTipo(e.target.value as (typeof TIPOS_VOLUME)[number])}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {TIPOS_VOLUME.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={processando === "novo-volume"}
          onClick={() => executar("novo-volume", () => criarVolumeAction({ remessaId: remessa.id, tipo: novoTipo }))}
        >
          {processando === "novo-volume" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Criar volume
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {remessa.volumes.map((volume) => {
          const sel = selecaoItem[volume.id] ?? { itemId: remessa.itens[0]?.id ?? "", quantidade: 1 };
          return (
            <Card key={volume.id}>
              <CardContent className="flex flex-col gap-2.5 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    Volume #{volume.numeroVolume} — {volume.tipo}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {volume.status}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {volume.itens.length === 0 ? (
                    <span>Nenhum item embalado ainda.</span>
                  ) : (
                    volume.itens.map((iv) => {
                      const item = remessa.itens.find((i) => i.id === iv.itemRemessaId);
                      return (
                        <span key={iv.id}>
                          {item?.descricao ?? "?"}: {iv.quantidade}
                        </span>
                      );
                    })
                  )}
                </div>
                {volume.status === "ABERTO" && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={sel.itemId}
                      onChange={(e) =>
                        setSelecaoItem((prev) => ({ ...prev, [volume.id]: { ...sel, itemId: e.target.value } }))
                      }
                      className="h-7 flex-1 rounded border border-input bg-background px-1 text-xs"
                    >
                      {remessa.itens.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.descricao}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={sel.quantidade}
                      onChange={(e) =>
                        setSelecaoItem((prev) => ({
                          ...prev,
                          [volume.id]: { ...sel, quantidade: Number(e.target.value) },
                        }))
                      }
                      className="h-7 w-14 rounded border border-input bg-background px-1 text-right text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={processando === `add-item-${volume.id}`}
                      onClick={() =>
                        executar(`add-item-${volume.id}`, () =>
                          vincularItemAoVolumeAction({
                            volumeId: volume.id,
                            itemRemessaId: sel.itemId,
                            quantidade: sel.quantidade,
                            remessaId: remessa.id,
                          })
                        )
                      }
                    >
                      +
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carregamentos
// ---------------------------------------------------------------------------

function AbaCarregamentos({
  remessa,
  transportadoras,
  motoristas,
  veiculos,
  processando,
  executar,
}: {
  remessa: RemessaDetalhe;
  transportadoras: Array<{ id: string; nome: string }>;
  motoristas: Array<{ id: string; nome: string; transportadora: { nome: string } | null }>;
  veiculos: Array<{ id: string; placa: string; modelo: string | null; transportadora: { nome: string } | null }>;
  processando: string | null;
  executar: (chave: string, fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [volumeParaVincular, setVolumeParaVincular] = React.useState<Record<string, string>>({});
  const [saidaSelecao, setSaidaSelecao] = React.useState<Record<string, { motoristaId: string; veiculoId: string }>>({});

  const volumesDisponiveis = remessa.volumes.filter((v) => v.status === "CONFERIDO" || v.status === "ABERTO");

  return (
    <div className="flex flex-col gap-4">
      <Button
        size="sm"
        className="w-fit"
        disabled={processando === "novo-carregamento"}
        onClick={() =>
          executar("novo-carregamento", () => criarCarregamentoAction({ remessaId: remessa.id, empresaId: remessa.empresaId }))
        }
      >
        {processando === "novo-carregamento" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Criar carregamento
      </Button>

      {remessa.carregamentos.map((c) => {
        const volumeSelId = volumeParaVincular[c.id] ?? volumesDisponiveis[0]?.id ?? "";
        const saida = saidaSelecao[c.id] ?? { motoristaId: motoristas[0]?.id ?? "", veiculoId: veiculos[0]?.id ?? "" };

        return (
          <Card key={c.id}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Carregamento #{c.numero}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {c.status}
                </span>
              </div>

              <div className="text-xs text-muted-foreground">
                {c.volumes.length} volume(s) vinculado(s) · {c.itens.reduce((a, i) => a + i.quantidade, 0)} unidade(s)
              </div>

              {(c.status === "RASCUNHO" ||
                c.status === "EM_PREPARACAO" ||
                c.status === "AGUARDANDO_CONFERENCIA" ||
                c.status === "CONFERIDO") &&
                volumesDisponiveis.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={volumeSelId}
                      onChange={(e) => setVolumeParaVincular((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      className="h-8 flex-1 rounded border border-input bg-background px-2 text-xs"
                    >
                      {volumesDisponiveis.map((v) => (
                        <option key={v.id} value={v.id}>
                          Volume #{v.numeroVolume} ({v.tipo})
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={processando === `vincular-vol-${c.id}`}
                      onClick={() =>
                        executar(`vincular-vol-${c.id}`, () =>
                          vincularVolumeAoCarregamentoAction({
                            carregamentoId: c.id,
                            volumeId: volumeSelId,
                            remessaId: remessa.id,
                            empresaId: remessa.empresaId,
                          })
                        )
                      }
                    >
                      Vincular volume
                    </Button>
                  </div>
                )}

              <div className="flex flex-wrap gap-2">
                {["RASCUNHO", "EM_PREPARACAO", "AGUARDANDO_CONFERENCIA"].includes(c.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled
                    title="Fluxo simplificado: use os botões abaixo assim que o carregamento estiver com volumes"
                  >
                    Avançar etapa
                  </Button>
                )}
                {c.status === "CONFERIDO" && (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={processando === `liberar-${c.id}`}
                    onClick={() =>
                      executar(`liberar-${c.id}`, () =>
                        liberarCarregamentoAction({
                          carregamentoId: c.id,
                          remessaId: remessa.id,
                          empresaId: remessa.empresaId,
                        })
                      )
                    }
                  >
                    Liberar carregamento
                  </Button>
                )}
                {c.status === "LIBERADO" && (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={processando === `carregado-${c.id}`}
                    onClick={() =>
                      executar(`carregado-${c.id}`, () =>
                        marcarComoCarregadoAction({ carregamentoId: c.id, remessaId: remessa.id })
                      )
                    }
                  >
                    Marcar como carregado
                  </Button>
                )}
                {c.status === "CARREGADO" && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      value={saida.motoristaId}
                      onChange={(e) =>
                        setSaidaSelecao((prev) => ({ ...prev, [c.id]: { ...saida, motoristaId: e.target.value } }))
                      }
                      className="h-8 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Motorista...</option>
                      {motoristas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                    <select
                      value={saida.veiculoId}
                      onChange={(e) =>
                        setSaidaSelecao((prev) => ({ ...prev, [c.id]: { ...saida, veiculoId: e.target.value } }))
                      }
                      className="h-8 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Veículo...</option>
                      {veiculos.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.placa}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      disabled={processando === `saida-${c.id}`}
                      onClick={() =>
                        executar(`saida-${c.id}`, () =>
                          registrarSaidaAction({
                            carregamentoId: c.id,
                            remessaId: remessa.id,
                            empresaId: remessa.empresaId,
                            motoristaId: saida.motoristaId || undefined,
                            veiculoId: saida.veiculoId || undefined,
                          })
                        )
                      }
                    >
                      Registrar saída
                    </Button>
                  </div>
                )}
                {!["SAIDA_REGISTRADA", "ENTREGUE", "CANCELADO"].includes(c.status) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-destructive"
                    disabled={processando === `cancelar-${c.id}`}
                    onClick={() =>
                      executar(`cancelar-${c.id}`, () =>
                        cancelarCarregamentoAction({
                          carregamentoId: c.id,
                          remessaId: remessa.id,
                          motivo: "Cancelado pela equipe de expedição",
                        })
                      )
                    }
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Histórico
// ---------------------------------------------------------------------------

function AbaHistorico({
  historico,
}: {
  historico: Array<{
    id: string;
    tipoEvento: string;
    statusAnterior: string | null;
    statusNovo: string;
    observacao: string | null;
    createdAt: Date;
    usuario: { nome: string };
  }>;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col divide-y divide-border/60 p-0">
        {historico.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
        ) : (
          historico.map((h) => (
            <div key={h.id} className="flex items-start gap-3 px-4 py-3">
              <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{h.tipoEvento.replaceAll("_", " ")}</span>
                <span className="text-xs text-muted-foreground">
                  {h.usuario.nome} · {h.createdAt.toLocaleString("pt-BR")}
                  {h.observacao && ` · ${h.observacao}`}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
