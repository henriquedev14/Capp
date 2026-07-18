"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STATUS_EMPREENDIMENTO } from "@/features/empreendimentos/constants";

interface FiltrosEmpreendimentosProps {
  buscaInicial?: string;
  statusInicial?: string;
  total: number;
}

export function FiltrosEmpreendimentos({
  buscaInicial = "",
  statusInicial = "",
  total,
}: FiltrosEmpreendimentosProps) {
  const router = useRouter();
  const [busca, setBusca] = React.useState(buscaInicial);
  const [status, setStatus] = React.useState(statusInicial);

  function aplicarFiltros(novaBusca: string, novoStatus: string) {
    const params = new URLSearchParams();
    if (novaBusca) params.set("busca", novaBusca);
    if (novoStatus) params.set("status", novoStatus);
    const query = params.toString();
    router.push(`/empreendimentos${query ? `?${query}` : ""}`);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const novoStatus = e.target.value;
    setStatus(novoStatus);
    aplicarFiltros(busca, novoStatus);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    aplicarFiltros(busca, status);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, cidade ou cliente..."
          className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        />
      </div>

      <select
        value={status}
        onChange={handleStatusChange}
        className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-pointer"
      >
        <option value="">Todos os status</option>
        {STATUS_EMPREENDIMENTO.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <Button type="submit" variant="outline" size="sm">
        Buscar
      </Button>

      <span className="ml-auto text-sm text-muted-foreground shrink-0">
        {total} {total === 1 ? "empreendimento" : "empreendimentos"}
      </span>
    </form>
  );
}
