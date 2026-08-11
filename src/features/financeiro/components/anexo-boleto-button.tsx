"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Loader2, X, FileText } from "lucide-react";

interface Props {
  contaId: string;
  tipo: "pagar" | "receber";
  boletoNome: string | null;
  onUpload: (contaId: string, formData: FormData) => Promise<{ ok?: boolean; erro?: string }>;
  onRemover: (contaId: string) => Promise<{ ok?: boolean; erro?: string }>;
}

export function AnexoBoletoButton({ contaId, tipo, boletoNome, onUpload, onRemover }: Props) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = React.useState(false);

  async function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);
      const r = await onUpload(contaId, formData);
      if (r.erro) alert(r.erro);
      else router.refresh();
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemover(e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Remover o boleto anexado?")) return;
    const r = await onRemover(contaId);
    if (r.erro) alert(r.erro);
    else router.refresh();
  }

  if (boletoNome) {
    return (
      <div className="flex items-center gap-1.5">
        <a
          href={`/api/boletos/conta-${tipo}/${contaId}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          title={boletoNome}
        >
          <FileText className="h-3.5 w-3.5" />
          Boleto
        </a>
        <button onClick={handleRemover} className="text-muted-foreground hover:text-destructive" title="Remover boleto">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <label
      onClick={(e) => e.stopPropagation()}
      className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-primary"
    >
      {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
      Anexar boleto
      <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleArquivoSelecionado} />
    </label>
  );
}
