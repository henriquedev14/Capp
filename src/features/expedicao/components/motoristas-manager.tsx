"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { criarMotoristaAction } from "@/features/expedicao/actions/expedicao-actions";

interface Motorista {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  tipo: string;
  ativo: boolean;
  transportadora: { nome: string } | null;
}

interface Props {
  motoristas: Motorista[];
  transportadoras: Array<{ id: string; nome: string }>;
  empresas: Array<{ id: string; nome: string }>;
}

export function MotoristasManager({ motoristas, transportadoras, empresas }: Props) {
  const router = useRouter();
  const [nome, setNome] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [empresaId, setEmpresaId] = React.useState(empresas[0]?.id ?? "");
  const [transportadoraId, setTransportadoraId] = React.useState("");
  const [tipo, setTipo] = React.useState<"PROPRIO" | "TERCEIRO">("TERCEIRO");
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function handleAdicionar() {
    setErro(null);
    if (!nome.trim()) return setErro("Nome é obrigatório.");
    if (!empresaId) return setErro("Selecione a empresa.");
    setSalvando(true);
    try {
      const resultado = await criarMotoristaAction({
        nome,
        empresaId,
        telefone: telefone || undefined,
        transportadoraId: transportadoraId || undefined,
        tipo,
      });
      if ("erro" in resultado) {
        setErro(resultado.erro);
        return;
      }
      setNome("");
      setTelefone("");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-[15px]">Novo motorista</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <div className="flex flex-1 min-w-[180px] flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
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
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "PROPRIO" | "TERCEIRO")}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="TERCEIRO">Terceiro</option>
              <option value="PROPRIO">Próprio</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Transportadora (opcional)</label>
            <select
              value={transportadoraId}
              onChange={(e) => setTransportadoraId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Nenhuma</option>
              {transportadoras.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Telefone (opcional)</label>
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="h-9 w-36 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <Button onClick={handleAdicionar} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </Button>
        </CardContent>
        {erro && <p className="px-4 pb-4 text-sm text-destructive">{erro}</p>}
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Transportadora</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {motoristas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum motorista cadastrado ainda.
                  </td>
                </tr>
              ) : (
                motoristas.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5 font-medium text-foreground">{m.nome}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{m.tipo === "PROPRIO" ? "Próprio" : "Terceiro"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{m.transportadora?.nome ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{m.telefone ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
