"use client";

import * as React from "react";
import { Plus, X, Zap } from "lucide-react";

// Tipos base — o usuário pode adicionar mais além destes
const TIPOS_BASE = [
  { valor: "SOBRE_FORRO", label: "Sobre forro" },
  { valor: "NA_LAJE", label: "Na laje" },
  { valor: "DRYWALL", label: "Drywall" },
  { valor: "PAREDE_DE_CONCRETO", label: "Parede de concreto" },
  { valor: "ALVENARIA", label: "Alvenaria" },
];

function labelDoTipo(valor: string): string {
  const base = TIPOS_BASE.find((t) => t.valor === valor);
  if (base) return base.label;
  // Tipos customizados são salvos como texto livre
  return valor;
}

interface TiposInstalacaoFieldProps {
  selecionados: string[];
  onChange: (tipos: string[]) => void;
}

/**
 * Multi-select de tipos de instalação do kit elétrico.
 * Aparece apenas quando o Kit Elétrico está marcado.
 *
 * O empreendimento pode mesclar tipos (ex: pontos de teto na laje +
 * tomadas em alvenaria + trechos em drywall). Esses dados definem o
 * tipo de caixa a ser usado em cada ponto — refinado por peça/trecho
 * no Levantamento Elétrico.
 *
 * Além dos tipos base, o usuário pode adicionar tipos customizados,
 * pois a lista não é fechada.
 */
export function TiposInstalacaoField({ selecionados, onChange }: TiposInstalacaoFieldProps) {
  const [novoTipo, setNovoTipo] = React.useState("");
  const [adicionando, setAdicionando] = React.useState(false);

  // Tipos customizados que o usuário adicionou (não estão na lista base)
  const customizados = selecionados.filter(
    (s) => !TIPOS_BASE.some((t) => t.valor === s)
  );

  function toggle(valor: string) {
    if (selecionados.includes(valor)) {
      onChange(selecionados.filter((s) => s !== valor));
    } else {
      onChange([...selecionados, valor]);
    }
  }

  function adicionarCustomizado() {
    const tipo = novoTipo.trim();
    if (!tipo) return;
    if (selecionados.includes(tipo)) {
      setNovoTipo("");
      setAdicionando(false);
      return;
    }
    onChange([...selecionados, tipo]);
    setNovoTipo("");
    setAdicionando(false);
  }

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Tipos de instalação — Kit Elétrico</span>
        <span className="text-xs text-muted-foreground">
          (pode selecionar vários — define o tipo de caixa por ponto)
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {TIPOS_BASE.map((tipo) => {
          const ativo = selecionados.includes(tipo.valor);
          return (
            <button
              key={tipo.valor}
              type="button"
              onClick={() => toggle(tipo.valor)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                ativo
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {tipo.label}
            </button>
          );
        })}

        {/* Tipos customizados adicionados pelo usuário */}
        {customizados.map((tipo) => (
          <span
            key={tipo}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium"
          >
            {labelDoTipo(tipo)}
            <button
              type="button"
              onClick={() => toggle(tipo)}
              className="hover:opacity-70"
              aria-label={`Remover ${tipo}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Adicionar tipo customizado */}
        {adicionando ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={novoTipo}
              onChange={(e) => setNovoTipo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionarCustomizado();
                }
                if (e.key === "Escape") {
                  setNovoTipo("");
                  setAdicionando(false);
                }
              }}
              onBlur={adicionarCustomizado}
              placeholder="Nome do tipo..."
              className="h-8 w-36 rounded-full border border-primary bg-background px-3 text-xs focus:outline-none"
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdicionando(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            <Plus className="h-3 w-3" />
            Outro tipo
          </button>
        )}
      </div>

      {selecionados.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {selecionados.length} {selecionados.length === 1 ? "tipo selecionado" : "tipos selecionados"}
          {" — "}no levantamento elétrico, cada peça/trecho poderá especificar qual tipo se aplica.
        </p>
      )}
    </div>
  );
}
