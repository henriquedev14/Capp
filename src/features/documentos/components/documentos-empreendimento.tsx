"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Trash2,
  Loader2,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  uploadDocumentoEmpreendimento,
  excluirDocumentoEmpreendimento,
  type DocumentoResumo,
} from "@/features/documentos/actions/documento-actions";

interface Props {
  empreendimentoId: string;
  documentos: DocumentoResumo[];
}

function formatTamanho(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function IconePorTipo({ tipo }: { tipo: string | null }) {
  if (tipo?.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-primary" />;
  if (tipo === "application/pdf") return <FileText className="h-4 w-4 text-destructive" />;
  return <FileIcon className="h-4 w-4 text-muted-foreground" />;
}

export function DocumentosEmpreendimento({ empreendimentoId, documentos }: Props) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [excluindoId, setExcluindoId] = React.useState<string | null>(null);
  const [arrastandoSobre, setArrastandoSobre] = React.useState(false);
  // Arquivo escolhido mas ainda não confirmado — só sobe de fato quando o
  // usuário clica em "Salvar", pra dar chance de conferir antes de anexar.
  const [pendente, setPendente] = React.useState<File | null>(null);

  function selecionar(arquivo: File) {
    setErro(null);
    setPendente(arquivo);
  }

  function handleSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (arquivo) selecionar(arquivo);
    e.target.value = ""; // permite selecionar o mesmo arquivo de novo depois
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setArrastandoSobre(false);
    const arquivo = e.dataTransfer.files?.[0];
    if (arquivo) selecionar(arquivo);
  }

  function cancelarPendente() {
    setPendente(null);
    setErro(null);
  }

  async function confirmarSalvar() {
    if (!pendente) return;
    setErro(null);
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("arquivo", pendente);
      const r = await uploadDocumentoEmpreendimento(empreendimentoId, formData);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setPendente(null);
      router.refresh();
    } catch (e) {
      setErro(
        e instanceof Error
          ? `Erro inesperado: ${e.message}`
          : "Erro inesperado ao enviar o arquivo. Veja o log do servidor."
      );
    } finally {
      setEnviando(false);
    }
  }

  async function handleExcluir(id: string, nome: string) {
    if (!confirm(`Remover "${nome}"? Essa ação não pode ser desfeita.`)) return;
    setExcluindoId(id);
    try {
      const r = await excluirDocumentoEmpreendimento(id);
      if (r.erro) {
        alert(r.erro);
        return;
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro inesperado ao excluir.");
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
          <Upload className="h-[18px] w-[18px] text-accent-foreground" />
        </div>
        <CardTitle className="text-[15px]">Documentos ({documentos.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-5">
        {/* Área de upload — clique ou arrastar-e-soltar (escondida quando
            já tem um arquivo pendente de confirmação) */}
        {!pendente && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastandoSobre(true);
            }}
            onDragLeave={() => setArrastandoSobre(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors " +
              (arrastandoSobre
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-secondary/30")
            }
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleSelecionarArquivo}
            />
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Clique ou arraste um arquivo aqui
            </span>
            <span className="text-xs text-muted-foreground">
              Contratos, plantas, fotos — até 15MB
            </span>
          </div>
        )}

        {/* Prévia do arquivo escolhido — só sobe de verdade ao clicar em
            "Salvar", dando chance de conferir antes de anexar. */}
        {pendente && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-center gap-2.5">
              <IconePorTipo tipo={pendente.type} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">
                  {pendente.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTamanho(pendente.size)} · pronto para salvar
                </span>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelarPendente}
                disabled={enviando}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={confirmarSalvar} disabled={enviando}>
                {enviando ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        )}

        {erro && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {erro}
          </div>
        )}

        {/* Lista de documentos já anexados */}
        {documentos.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Nenhum documento anexado ainda.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {documentos.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <IconePorTipo tipo={doc.tipo} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {doc.nome}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTamanho(doc.tamanho)}
                      {doc.usuarioNome && ` · ${doc.usuarioNome}`}
                      {" · "}
                      {new Date(doc.criadoEm).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={`/api/documentos/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title="Baixar / abrir"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleExcluir(doc.id, doc.nome)}
                    disabled={excluindoId === doc.id}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Excluir"
                  >
                    {excluindoId === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
