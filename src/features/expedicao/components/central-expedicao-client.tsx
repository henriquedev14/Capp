"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, AlertTriangle, X, MapPin, User, Truck as TruckIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatusRemessaBadge } from "@/features/expedicao/components/status-remessa-badge";
import { buscarRemessaDetalheAction } from "@/features/expedicao/actions/expedicao-actions";

interface LinhaFila {
  id: string;
  numero: string;
  empreendimentoNome: string;
  cidade: string;
  estado: string;
  torreEtapa: string;
  volumes: number;
  transportadoraNome: string;
  dataSaidaPrevista: Date | null;
  status: string;
  temDivergencia: boolean;
}

type Visao = "todas" | "hoje" | "aguardando" | "em_rota" | "com_divergencia";

const TABS: { value: Visao; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "hoje", label: "Hoje" },
  { value: "aguardando", label: "Aguardando" },
  { value: "em_rota", label: "Em rota" },
  { value: "com_divergencia", label: "Com divergência" },
];

export function CentralExpedicaoClient({ linhas: linhasIniciais }: { linhas: LinhaFila[] }) {
  const [aba, setAba] = React.useState<Visao>("todas");
  const [busca, setBusca] = React.useState("");
  const [selecionadaId, setSelecionadaId] = React.useState<string | null>(null);
  const [detalhe, setDetalhe] = React.useState<Awaited<ReturnType<typeof buscarRemessaDetalheAction>> | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = React.useState(false);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const linhasFiltradas = linhasIniciais.filter((l) => {
    if (busca) {
      const alvo = `${l.numero} ${l.empreendimentoNome} ${l.torreEtapa}`.toLowerCase();
      if (!alvo.includes(busca.toLowerCase())) return false;
    }
    if (aba === "hoje") {
      return l.dataSaidaPrevista && l.dataSaidaPrevista >= hoje && l.dataSaidaPrevista < amanha;
    }
    if (aba === "aguardando") {
      return ["AGUARDANDO_SEPARACAO", "EM_SEPARACAO", "AGUARDANDO_CONFERENCIA", "EM_CONFERENCIA"].includes(l.status);
    }
    if (aba === "em_rota") {
      return ["EM_TRANSITO", "PARCIALMENTE_EXPEDIDA"].includes(l.status);
    }
    if (aba === "com_divergencia") {
      return l.temDivergencia;
    }
    return true;
  });

  async function selecionarRemessa(id: string) {
    setSelecionadaId(id);
    setCarregandoDetalhe(true);
    try {
      const d = await buscarRemessaDetalheAction(id);
      setDetalhe(d);
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  return (
    <div className="flex gap-5">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setAba(t.value)}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                aba === t.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por remessa, obra ou torre..."
            className="h-9 min-w-[220px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Remessa</th>
                    <th className="px-4 py-3 font-medium">Obra</th>
                    <th className="px-4 py-3 font-medium">Torre/Etapa</th>
                    <th className="px-4 py-3 font-medium">Volumes</th>
                    <th className="px-4 py-3 font-medium">Transportadora</th>
                    <th className="px-4 py-3 font-medium">Saída prevista</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {linhasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Nenhuma remessa encontrada.
                      </td>
                    </tr>
                  ) : (
                    linhasFiltradas.map((l) => (
                      <tr
                        key={l.id}
                        onClick={() => selecionarRemessa(l.id)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-secondary/40",
                          selecionadaId === l.id && "bg-secondary/60"
                        )}
                      >
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                l.temDivergencia ? "bg-destructive" : "bg-primary"
                              )}
                            />
                            {l.numero}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{l.empreendimentoNome}</td>
                        <td className="px-4 py-3 text-muted-foreground">{l.torreEtapa}</td>
                        <td className="px-4 py-3 text-muted-foreground">{l.volumes}</td>
                        <td className="px-4 py-3 text-muted-foreground">{l.transportadoraNome}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {l.dataSaidaPrevista ? l.dataSaidaPrevista.toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusRemessaBadge status={l.status} />
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/expedicao/${l.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                          >
                            Abrir <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Painel lateral de detalhe */}
      {selecionadaId && (
        <div className="w-[340px] shrink-0">
          <Card className="sticky top-4">
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    {detalhe?.numero ?? "Carregando..."}
                  </span>
                  {detalhe && (
                    <div className="mt-1">
                      <StatusRemessaBadge status={detalhe.status} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelecionadaId(null);
                    setDetalhe(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {carregandoDetalhe ? (
                <p className="text-sm text-muted-foreground">Carregando detalhes...</p>
              ) : detalhe ? (
                <>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div>
                        <div className="text-foreground">{detalhe.empreendimento.nome}</div>
                        <div className="text-xs text-muted-foreground">{detalhe.enderecoEntrega}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">{detalhe.criadoPor.nome}</span>
                    </div>
                    {detalhe.carregamentos[0]?.veiculo && (
                      <div className="flex items-center gap-2">
                        <TruckIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {detalhe.carregamentos[0].veiculo.modelo} — {detalhe.carregamentos[0].veiculo.placa}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-secondary/40 p-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Itens</div>
                      <div className="font-semibold text-foreground">{detalhe.itens.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Volumes</div>
                      <div className="font-semibold text-foreground">{detalhe.volumes.length}</div>
                    </div>
                  </div>

                  {detalhe.itens.some((i) => i.status === "DIVERGENTE") && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Há itens com divergência nesta remessa
                    </div>
                  )}

                  <Link href={`/expedicao/${detalhe.id}`}>
                    <Button className="w-full" size="sm">
                      Abrir remessa completa
                    </Button>
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Não foi possível carregar.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
