"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { atualizarMeuPerfil } from "@/features/auth/actions/atualizar-perfil-actions";

interface Props {
  cargoAtual: string | null;
  telefoneAtual: string | null;
}

export function EditarPerfilForm({ cargoAtual, telefoneAtual }: Props) {
  const router = useRouter();
  const [cargo, setCargo] = React.useState(cargoAtual ?? "");
  const [telefone, setTelefone] = React.useState(telefoneAtual ?? "");
  const [salvando, setSalvando] = React.useState(false);
  const [salvo, setSalvo] = React.useState(false);

  async function handleSalvar() {
    setSalvando(true);
    setSalvo(false);
    const r = await atualizarMeuPerfil(cargo, telefone);
    setSalvando(false);
    if (r.erro) {
      alert(r.erro);
      return;
    }
    setSalvo(true);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-[15px]">Dados de assinatura</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Usados como &quot;Associado&quot; na Proposta Comercial gerada por você.
        </p>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col gap-4 max-w-sm">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cargo">Cargo</Label>
          <Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Head de Operações" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Ex: (34) 99137-4353" />
        </div>
        <Button onClick={handleSalvar} disabled={salvando} className="w-fit">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : salvo ? <Check className="h-4 w-4" /> : null}
          {salvo ? "Salvo" : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  );
}
