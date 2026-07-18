"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Check,
  X,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  calcularComprimentoReal,
  type PecaLevantamento,
  type CircuitoCatalogo,
  type CircuitoPeca,
} from "@/core/empreendimentos/entities/levantamento-eletrico";
import {
  atualizarPeca,
  excluirPeca,
  adicionarCircuito,
  atualizarCircuito,
  excluirCircuito,
} from "@/features/levantamento/actions/levantamento-actions";

const TIPOS_KIT = ["LAJE", "VERTICAL", "PISO"] as const;
const DIAMETROS = ['3/4"', '1"', '1.1/4"', '1.1/2"'] as const;
const CORES = ["vermelho", "preto", "azul", "verde", "amarelo", "branco"] as const;
const CORES_LABEL: Record<string, string> = {
  vermelho: "Verm", preto: "Preto", azul: "Azul",
  verde: "Verde", amarelo: "Amar", branco: "Bco",
};
const CORES_CSS: Record<string, string> = {
  vermelho: "text-red-500",
  preto: "text-foreground",
  azul: "text-blue-500",
  verde: "text-green-500",
  amarelo: "text-yellow-500",
  branco: "text-gray-400",
};

interface PecaEditorProps {
  empreendimentoId: string;
  peca: PecaLevantamento;
  catalogo: CircuitoCatalogo[];
}

// Campo numérico inline com edição e validação no blur
function NumField({
  value,
  onChange,
  width = "w-16",
}: {
  value: number;
  onChange: (v: number) => void;
  width?: string;
}) {
  const [raw, setRaw] = React.useState(String(value));
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    if (!editing) setRaw(String(value));
  }, [value, editing]);

  return (
    <input
      type="number"
      value={raw}
      onChange={(e) => { setRaw(e.target.value); setEditing(true); }}
      onBlur={() => {
        setEditing(false);
        const v = parseFloat(raw);
        if (!isNaN(v) && v >= 0) onChange(v);
        else setRaw(String(value));
      }}
      className={`${width} rounded border border-transparent bg-transparent px-1 py-0.5 text-xs font-mono text-right focus:border-primary focus:bg-background focus:outline-none`}
      step="0.01"
    />
  );
}

export function PecaEditor({ empreendimentoId, peca, catalogo }: PecaEditorProps) {
  const router = useRouter();
  const [expandido, setExpandido] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);
  const [excluindo, setExcluindo] = React.useState(false);

  // Estado local da peça para edição inline
  const [dados, setDados] = React.useState({
    trecho: peca.trecho,
    local: peca.local ?? "",
    kit: peca.kit,
    diametro: peca.diametro,
    sobra: peca.sobra,
    vertical1: peca.vertical1,
    laje1: peca.laje1,
    horiz: peca.horiz,
    laje2: peca.laje2,
    vertical2: peca.vertical2,
  });

  const [qtdCircuitos, setQtdCircuitos] = React.useState(
    peca.circuitos.length > 0 ? peca.circuitos.length : 1
  );
  const [criandoLinhas, setCriandoLinhas] = React.useState(false);

  async function handleQtdChange(qtd: number) {
    if (qtd < 1 || qtd === peca.circuitos.length) return;
    setCriandoLinhas(true);

    const diff = qtd - peca.circuitos.length;

    if (diff > 0) {
      // Adiciona linhas em branco
      for (let i = 0; i < diff; i++) {
        await adicionarCircuito(empreendimentoId, peca.id, {
          catalogoId: null,
          bitola: 0,
          circuito: null,
          temVermelho: false,
          temPreto: false,
          temAzul: false,
          temVerde: false,
          temAmarelo: false,
          temBranco: false,
          temCinza: false,
          ehParalelo: false,
          ehRetorno: false,
        });
      }
    } else {
      // Remove as últimas linhas
      const aRemover = peca.circuitos.slice(diff);
      for (const circ of aRemover) {
        await excluirCircuito(empreendimentoId, circ.id);
      }
    }

    setCriandoLinhas(false);
    setExpandido(true);
    router.refresh();
  }
  const modificado = JSON.stringify(dados) !== JSON.stringify({
    trecho: peca.trecho, local: peca.local ?? "", kit: peca.kit,
    diametro: peca.diametro, sobra: peca.sobra, vertical1: peca.vertical1,
    laje1: peca.laje1, horiz: peca.horiz, laje2: peca.laje2, vertical2: peca.vertical2,
  });

  const comprimentoReal = calcularComprimentoReal({ ...peca, ...dados });

  async function salvar() {
    setSalvando(true);
    const resultado = await atualizarPeca(empreendimentoId, peca.id, {
      ...dados, local: dados.local || null,
    });
    setSalvando(false);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  async function handleExcluir() {
    if (!confirm(`Excluir PEÇA ${String(peca.numero).padStart(2, "0")} (${peca.trecho})?`)) return;
    setExcluindo(true);
    const resultado = await excluirPeca(empreendimentoId, peca.id);
    setExcluindo(false);
    if ("erro" in resultado) { alert(resultado.erro); return; }
    router.refresh();
  }

  async function handleAdicionarCircuito() {
    const c = catalogo[0];
    if (!c) return;
    await adicionarCircuito(empreendimentoId, peca.id, {
      catalogoId: c.id,
      bitola: c.bitola,
      circuito: c.numero,
      temVermelho: c.temVermelho,
      temPreto: c.temPreto,
      temAzul: c.temAzul,
      temVerde: c.temVerde,
      temAmarelo: c.temAmarelo,
      temBranco: c.temBranco,
      temCinza: c.temCinza,
      ehParalelo: false,
      ehRetorno: false,
    });
    router.refresh();
    setExpandido(true);
  }

  return (
    <div className={`${peca.circuitos.length > 0 ? "ring-2 ring-border my-1 mx-2 rounded-lg overflow-hidden" : "border-b border-border last:border-0"}`}>
      {/* Linha principal da peça */}
      <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-secondary/20 group">
        {/* Número */}
        <span className="w-14 shrink-0 text-xs font-mono font-semibold text-muted-foreground">
          {String(peca.numero).padStart(2, "0")}
        </span>

        {/* Tipo */}
        <select
          value={dados.kit}
          onChange={(e) => setDados((d) => ({ ...d, kit: e.target.value as typeof dados.kit }))}
          className="w-20 shrink-0 rounded border border-transparent bg-transparent text-xs text-muted-foreground focus:border-primary focus:bg-background focus:outline-none"
        >
          {TIPOS_KIT.map((k) => <option key={k}>{k}</option>)}
        </select>

        {/* Trecho */}
        <input
          value={dados.trecho}
          onChange={(e) => setDados((d) => ({ ...d, trecho: e.target.value }))}
          className="flex-1 min-w-0 rounded border border-transparent bg-transparent text-sm font-medium text-foreground focus:border-primary focus:bg-background focus:outline-none px-1"
          placeholder="Trecho"
        />

        {/* Local */}
        <input
          value={dados.local}
          onChange={(e) => setDados((d) => ({ ...d, local: e.target.value }))}
          className="w-32 hidden sm:block rounded border border-transparent bg-transparent text-xs text-muted-foreground focus:border-primary focus:bg-background focus:outline-none px-1"
          placeholder="Ambiente"
        />

        {/* Medidas inline */}
        <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
          <span className="text-[10px]">V1</span>
          <NumField value={dados.vertical1} onChange={(v) => setDados((d) => ({ ...d, vertical1: v }))} width="w-12" />
          <span className="text-[10px]">L1</span>
          <NumField value={dados.laje1} onChange={(v) => setDados((d) => ({ ...d, laje1: v }))} width="w-12" />
          <span className="text-[10px]">H</span>
          <NumField value={dados.horiz} onChange={(v) => setDados((d) => ({ ...d, horiz: v }))} width="w-12" />
          <span className="text-[10px]">L2</span>
          <NumField value={dados.laje2} onChange={(v) => setDados((d) => ({ ...d, laje2: v }))} width="w-12" />
          <span className="text-[10px]">V2</span>
          <NumField value={dados.vertical2} onChange={(v) => setDados((d) => ({ ...d, vertical2: v }))} width="w-12" />
        </div>

        {/* Diâmetro */}
        <select
          value={dados.diametro}
          onChange={(e) => setDados((d) => ({ ...d, diametro: e.target.value }))}
          className="w-20 shrink-0 rounded border border-transparent bg-transparent text-xs text-muted-foreground focus:border-primary focus:bg-background focus:outline-none"
        >
          {DIAMETROS.map((d) => <option key={d}>{d}</option>)}
        </select>

        {/* Campo Z — quantidade de circuitos que passam nesta peça */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground hidden xl:block">Circ.</span>
          <input
            type="number"
            min={1}
            value={qtdCircuitos}
            onChange={(e) => setQtdCircuitos(Math.max(1, parseInt(e.target.value) || 1))}
            onBlur={(e) => {
              const qtd = Math.max(1, parseInt(e.target.value) || 1);
              if (qtd !== peca.circuitos.length) handleQtdChange(qtd);
            }}
            className="w-10 rounded border border-input bg-background px-1 py-0.5 text-center text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            title="Quantidade de circuitos nesta peça"
          />
          {criandoLinhas && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>

        {/* Comprimento real calculado */}
        <span className={`w-16 shrink-0 text-right text-sm font-mono font-semibold ${modificado ? "text-primary" : "text-foreground"}`}>
          {comprimentoReal.toFixed(2)}m
        </span>

        {/* Ações */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {modificado && (
            <button onClick={salvar} disabled={salvando}
              className="flex h-7 w-7 items-center justify-center rounded text-success hover:bg-success/10"
              title="Salvar">
              {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
          )}
          <button onClick={handleAdicionarCircuito}
            className="flex h-7 w-7 items-center justify-center rounded text-primary hover:bg-primary/10"
            title="Adicionar circuito">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setExpandido((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary"
            title={peca.circuitos.length > 0 ? `${peca.circuitos.length} circuito(s)` : "Expandir"}>
            {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {peca.circuitos.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-primary">
                {peca.circuitos.length}
              </span>
            )}
          </button>
          <button onClick={handleExcluir} disabled={excluindo}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Excluir peça">
            {excluindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Circuitos expandidos */}
      {expandido && (
        <div className="border-t border-border/50 bg-secondary/10 px-3 py-2">
          {peca.circuitos.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              Nenhum circuito — clique em + para adicionar.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {peca.circuitos.map((circ) => (
                <CircuitoEditor
                  key={circ.id}
                  empreendimentoId={empreendimentoId}
                  pecaId={peca.id}
                  circuito={circ}
                  catalogo={catalogo}
                  comprimentoPeca={comprimentoReal}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Circuito Editor ──────────────────────────────────────────────────────────

interface CircuitoEditorProps {
  empreendimentoId: string;
  pecaId: string;
  circuito: CircuitoPeca;
  catalogo: CircuitoCatalogo[];
  comprimentoPeca: number;
}

function CircuitoEditor({
  empreendimentoId,
  circuito,
  catalogo,
  comprimentoPeca,
}: CircuitoEditorProps) {
  const router = useRouter();
  const [dados, setDados] = React.useState({
    catalogoId: circuito.catalogoId ?? "",
    bitola: circuito.bitola,
    circuito: circuito.circuito ?? 0,
    temVermelho: circuito.temVermelho,
    temPreto: circuito.temPreto,
    temAzul: circuito.temAzul,
    temVerde: circuito.temVerde,
    temAmarelo: circuito.temAmarelo,
    temBranco: circuito.temBranco,
    ehParalelo: circuito.ehParalelo,
    ehRetorno: circuito.ehRetorno,
    identRetorno: circuito.identRetorno ?? "",
  });
  const [salvando, setSalvando] = React.useState(false);

  const compReal = calcularComprimentoReal(
    { vertical1: 0, laje1: 0, horiz: comprimentoPeca, laje2: 0, vertical2: 0, sobra: 0 },
    circuito.sobraOverride
  );

  function handleCatalogoChange(catalogoId: string) {
    const cat = catalogo.find((c) => c.id === catalogoId);
    if (!cat) return;
    setDados((d) => ({
      ...d,
      catalogoId,
      bitola: cat.bitola,
      circuito: cat.numero,
      temVermelho: cat.temVermelho,
      temPreto: cat.temPreto,
      temAzul: cat.temAzul,
      temVerde: cat.temVerde,
      temAmarelo: cat.temAmarelo,
      temBranco: cat.temBranco,
    }));
  }

  async function salvar() {
    setSalvando(true);
    await atualizarCircuito(empreendimentoId, circuito.id, {
      ...dados,
      catalogoId: dados.catalogoId || null,
      circuito: dados.circuito || null,
      identRetorno: dados.identRetorno || null,
    });
    setSalvando(false);
    router.refresh();
  }

  async function handleExcluir() {
    await excluirCircuito(empreendimentoId, circuito.id);
    router.refresh();
  }

  const fiosAtivos = CORES.filter((cor) => dados[`tem${cor.charAt(0).toUpperCase() + cor.slice(1)}` as keyof typeof dados] as boolean);

  return (
    <div className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary/30 group text-xs">
      {/* Seletor de catálogo */}
      <select
        value={dados.catalogoId}
        onChange={(e) => handleCatalogoChange(e.target.value)}
        className="w-36 rounded border border-transparent bg-transparent text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none"
      >
        <option value="">— circuito avulso —</option>
        {catalogo.map((c) => (
          <option key={c.id} value={c.id}>
            {c.numero}. {c.descricao} ({c.bitola}mm²)
          </option>
        ))}
      </select>

      {/* Bitola */}
      <span className="w-12 text-center font-mono text-muted-foreground">
        {dados.bitola}mm²
      </span>

      {/* Fios — checkboxes de cor */}
      <div className="flex items-center gap-0.5">
        {CORES.map((cor) => {
          const key = `tem${cor.charAt(0).toUpperCase() + cor.slice(1)}` as keyof typeof dados;
          const ativo = dados[key] as boolean;
          return (
            <button
              key={cor}
              type="button"
              onClick={() => setDados((d) => ({ ...d, [key]: !ativo }))}
              className={`rounded px-1 py-0.5 text-[10px] font-medium transition-colors ${
                ativo
                  ? `${CORES_CSS[cor]} bg-secondary`
                  : "text-muted-foreground/30 hover:text-muted-foreground"
              }`}
              title={cor}
            >
              {CORES_LABEL[cor]}
            </button>
          );
        })}
      </div>

      {/* Flags */}
      <label className="flex items-center gap-1 cursor-pointer text-muted-foreground">
        <input type="checkbox" checked={dados.ehParalelo}
          onChange={(e) => setDados((d) => ({ ...d, ehParalelo: e.target.checked }))}
          className="accent-primary" />
        <span>Par.</span>
      </label>
      <label className="flex items-center gap-1 cursor-pointer text-muted-foreground">
        <input type="checkbox" checked={dados.ehRetorno}
          onChange={(e) => setDados((d) => ({ ...d, ehRetorno: e.target.checked }))}
          className="accent-primary" />
        <span>Ret.</span>
      </label>

      {/* Identificador de retorno */}
      {dados.ehRetorno && (
        <input
          value={dados.identRetorno}
          onChange={(e) => setDados((d) => ({ ...d, identRetorno: e.target.value }))}
          placeholder="A, B, C..."
          className="w-12 rounded border border-input bg-background px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}

      {/* Comprimento */}
      <span className="ml-auto font-mono text-muted-foreground">{comprimentoPeca.toFixed(2)}m</span>

      {/* Salvar / Excluir */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={salvar} disabled={salvando}
          className="flex h-6 w-6 items-center justify-center rounded text-success hover:bg-success/10"
          title="Salvar circuito">
          {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </button>
        <button onClick={handleExcluir}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive"
          title="Remover circuito">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
