"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tag, Loader2, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { aplicarTabelaPrecoOrcamento } from "@/features/orcamentacao/actions/aplicar-tabela-preco-actions";

interface Fornecedor {
  id: string;
  nome: string;
}

interface Props {
  orcamentoId: string;
  empreendimentoId: string;
  fornecedoresDisponiveis: Fornecedor[];
}

export function AplicarTabelaPrecoButton({ orcamentoId, empreendimentoId, fornecedoresDisponiveis }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [selecionados, setSelecionados] = React.useState<string[]>([]);
  const [aplicando, setAplicando] = React.useState(false);
  const [mensagem, setMensagem] = React.useState<string | null>(null);

  function toggle(id: string) {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleAplicar() {
    setAplicando(true);
    setMensagem(null);
    const resultado = await aplicarTabelaPrecoOrcamento(orcamentoId, empreendimentoId, selecionados);
    setAplicando(false);
    if (resultado.erro) {
      setMensagem(resultado.erro);
      return;
    }
    setMensagem(
      `${resultado.aplicados} item(ns) precificado(s) pela Tabela de Preços. ${resultado.semMatch} sem material correspondente (mantiveram o preço anterior).`
    );
    router.refresh();
  }

  if (fornecedoresDisponiveis.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setAberto((v) => !v)}>
        <Tag className="h-4 w-4" />
        Aplicar Tabela de Preços
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>

      {aberto && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-border bg-background p-4 shadow-lg">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Escolha os fornecedores (ordem = prioridade se mais de um tiver o mesmo material):
          </p>
          <div className="mb-3 flex max-h-48 flex-col gap-1.5 overflow-y-auto">
            {fornecedoresDisponiveis.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selecionados.includes(f.id)} onChange={() => toggle(f.id)} />
                {f.nome}
              </label>
            ))}
          </div>
          {mensagem && <p className="mb-2 text-xs text-muted-foreground">{mensagem}</p>}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAplicar} disabled={aplicando || selecionados.length === 0}>
              {aplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Aplicar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
