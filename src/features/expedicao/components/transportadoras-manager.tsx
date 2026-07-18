"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { criarTransportadoraAction } from "@/features/expedicao/actions/expedicao-actions";

interface Transportadora {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  ativo: boolean;
}

export function TransportadorasManager({ transportadoras }: { transportadoras: Transportadora[] }) {
  const router = useRouter();
  const [nome, setNome] = React.useState("");
  const [cnpj, setCnpj] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function handleAdicionar() {
    setErro(null);
    if (!nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }
    setSalvando(true);
    try {
      const resultado = await criarTransportadoraAction({ nome, cnpj: cnpj || undefined, telefone: telefone || undefined });
      if ("erro" in resultado) {
        setErro(resultado.erro);
        return;
      }
      setNome("");
      setCnpj("");
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
          <CardTitle className="text-[15px]">Nova transportadora</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <div className="flex flex-1 min-w-[200px] flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="ex: TransObras Logística"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">CNPJ (opcional)</label>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              className="h-9 w-40 rounded-md border border-input bg-background px-2 text-sm"
            />
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
                <th className="px-4 py-3 font-medium">CNPJ</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {transportadoras.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma transportadora cadastrada ainda.
                  </td>
                </tr>
              ) : (
                transportadoras.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2.5 font-medium text-foreground">{t.nome}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.cnpj ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.telefone ?? "—"}</td>
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
