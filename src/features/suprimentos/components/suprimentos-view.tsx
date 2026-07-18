"use client";

import * as React from "react";
import { Loader2, PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  registrarEntradaEstoque,
  listarSaldoEstoqueDaObra,
  calcularPercentualRecebidoDaObra,
  type PercentualRecebido,
} from "@/features/suprimentos/actions/suprimentos-actions";

interface Props {
  empreendimentos: { id: string; nome: string; codigo: string }[];
  materiais: { id: string; nome: string; unidade: string; categoria: string }[];
}

interface SaldoItem {
  materialEletricoId: string;
  nome: string;
  categoria: string;
  unidade: string;
  saldo: number;
}

export function SuprimentosView({ empreendimentos, materiais }: Props) {
  const [empreendimentoId, setEmpreendimentoId] = React.useState("");
  const [materialId, setMaterialId] = React.useState("");
  const [quantidade, setQuantidade] = React.useState("");
  const [observacao, setObservacao] = React.useState("");
  const [registrando, setRegistrando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [sucesso, setSucesso] = React.useState(false);

  const [saldo, setSaldo] = React.useState<SaldoItem[]>([]);
  const [carregandoSaldo, setCarregandoSaldo] = React.useState(false);
  const [percentual, setPercentual] = React.useState<PercentualRecebido | null>(null);

  const carregarSaldo = React.useCallback(async (id: string) => {
    setCarregandoSaldo(true);
    try {
      const [dados, pct] = await Promise.all([
        listarSaldoEstoqueDaObra(id),
        calcularPercentualRecebidoDaObra(id),
      ]);
      setSaldo(dados);
      setPercentual(pct);
    } finally {
      setCarregandoSaldo(false);
    }
  }, []);

  React.useEffect(() => {
    if (empreendimentoId) carregarSaldo(empreendimentoId);
    else {
      setSaldo([]);
      setPercentual(null);
    }
  }, [empreendimentoId, carregarSaldo]);

  async function handleRegistrar() {
    setErro(null);
    setSucesso(false);
    if (!empreendimentoId) {
      setErro("Escolha a obra.");
      return;
    }
    if (!materialId) {
      setErro("Escolha o material.");
      return;
    }
    const qtdNum = Number(quantidade.replace(",", "."));
    if (!qtdNum || qtdNum <= 0) {
      setErro("Digite uma quantidade válida.");
      return;
    }

    setRegistrando(true);
    try {
      const r = await registrarEntradaEstoque({
        empreendimentoId,
        materialEletricoId: materialId,
        quantidade: qtdNum,
        observacao: observacao.trim() || undefined,
      });
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setQuantidade("");
      setObservacao("");
      setSucesso(true);
      await carregarSaldo(empreendimentoId);
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">Registrar entrada</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Obra de destino:</label>
            <select
              value={empreendimentoId}
              onChange={(e) => setEmpreendimentoId(e.target.value)}
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione a obra</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} — {e.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Material:</label>
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione o material</option>
              {materiais.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.unidade})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Quantidade recebida:</label>
              <input
                type="text"
                inputMode="decimal"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="0"
                className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Observação (opcional):</label>
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: NF 12345"
                className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
              />
            </div>
          </div>

          {erro && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{erro}</p>
          )}
          {sucesso && (
            <p className="rounded-md bg-success/10 px-3 py-2 text-sm font-medium text-success">
              Entrada registrada com sucesso.
            </p>
          )}

          <Button onClick={handleRegistrar} disabled={registrando}>
            {registrando ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
            Registrar entrada
          </Button>
        </CardContent>
      </Card>

      {empreendimentoId && percentual && (
        <Card className={percentual.percentual >= 100 ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"}>
          <CardContent className="flex items-center justify-between pt-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Material recebido pra essa obra
              </p>
              <p className={`text-2xl font-bold tabular-nums ${percentual.percentual >= 100 ? "text-success" : "text-warning"}`}>
                {percentual.percentual.toFixed(1)}%
              </p>
            </div>
            {percentual.itensComPendencia > 0 && (
              <p className="text-sm text-muted-foreground">
                {percentual.itensComPendencia} material(is) ainda não completo(s)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {empreendimentoId && (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-[15px]">Saldo atual dessa obra</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {carregandoSaldo ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : saldo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum material recebido ainda pra essa obra.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Material</th>
                      <th className="px-3 py-2 text-left font-medium">Categoria</th>
                      <th className="px-3 py-2 text-right font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {saldo.map((s) => (
                      <tr key={s.materialEletricoId}>
                        <td className="px-3 py-2 text-foreground">{s.nome}</td>
                        <td className="px-3 py-2 text-muted-foreground">{s.categoria}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums text-foreground">
                          {s.saldo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {s.unidade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
