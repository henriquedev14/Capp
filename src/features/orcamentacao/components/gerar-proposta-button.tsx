"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FileDown,
  Loader2,
  Lock,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  gerarPropostaComercial,
  registrarDecisaoCliente,
} from "@/features/orcamentacao/actions/proposta-actions";

interface Props {
  orcamentoId: string;
  // Só libera quando o orçamento estiver Aprovado E o Levantamento de
  // Materiais estiver validado pra toda tipologia com kit Elétrico.
  podeGerar: boolean;
  motivoBloqueio?: string;
  // Se a proposta desta revisão já foi gerada — vem do server, lido do
  // campo Orcamento.propostaGeradaEm.
  propostaJaGerada: boolean;
  propostaGeradaEm?: string | null;
  documentoId?: string | null;
  decisaoCliente?: "PENDENTE" | "ACEITA" | "RECUSADA" | null;
  // Só Diretor/Admin pode gerar de novo depois de já ter sido gerada.
  podeSobrescrever: boolean;
}

export function GerarPropostaButton({
  orcamentoId,
  podeGerar,
  motivoBloqueio,
  propostaJaGerada,
  propostaGeradaEm,
  documentoId,
  decisaoCliente,
  podeSobrescrever,
}: Props) {
  const router = useRouter();
  const [gerando, setGerando] = React.useState(false);
  const [registrando, setRegistrando] = React.useState<"ACEITA" | "RECUSADA" | null>(null);

  async function gerar() {
    setGerando(true);
    const r = await gerarPropostaComercial(orcamentoId);
    setGerando(false);
    if (r.erro) {
      alert(r.erro);
      return;
    }
    router.refresh();
  }

  function verPdf() {
    if (documentoId) {
      window.open(`/api/documentos/${documentoId}`, "_blank");
    } else {
      window.open(`/api/orcamentos/${orcamentoId}/proposta`, "_blank");
    }
  }

  async function decidir(decisao: "ACEITA" | "RECUSADA") {
    const obs =
      decisao === "RECUSADA"
        ? window.prompt("Motivo da recusa (opcional):") ?? undefined
        : undefined;
    setRegistrando(decisao);
    const r = await registrarDecisaoCliente(orcamentoId, decisao, obs);
    setRegistrando(null);
    if (r.erro) {
      alert(r.erro);
      return;
    }
    router.refresh();
  }

  // Bloqueado por pré-requisitos normais (orçamento não aprovado, materiais
  // não conferidos) — nunca chegou a gerar proposta ainda.
  if (!podeGerar && !propostaJaGerada) {
    return (
      <span
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground"
        title={motivoBloqueio}
      >
        <Lock className="h-3.5 w-3.5" />
        {motivoBloqueio ?? "Aguardando aprovação"}
      </span>
    );
  }

  // Já gerada — vira consulta. Diretor/Admin podem gerar de novo.
  if (propostaJaGerada) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="flex items-center gap-1.5 rounded-md border border-success/40 bg-success/5 px-3 py-1.5 text-xs font-medium text-success"
          title={propostaGeradaEm ? `Gerada em ${propostaGeradaEm}` : undefined}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Proposta gerada
        </span>
        <Button variant="outline" size="sm" onClick={verPdf}>
          <FileDown className="mr-1.5 h-4 w-4" />
          Ver PDF
        </Button>

        {/* Decisão do cliente — só faz sentido depois de gerada */}
        {decisaoCliente === "ACEITA" ? (
          <span className="flex items-center gap-1.5 rounded-md bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
            <ThumbsUp className="h-3.5 w-3.5" />
            Cliente aceitou
          </span>
        ) : decisaoCliente === "RECUSADA" ? (
          <span className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
            <ThumbsDown className="h-3.5 w-3.5" />
            Cliente recusou
          </span>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => decidir("ACEITA")}
              disabled={registrando !== null}
              className="border-success/40 text-success hover:bg-success/10"
            >
              {registrando === "ACEITA" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className="mr-1.5 h-4 w-4" />
              )}
              Cliente aceitou
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => decidir("RECUSADA")}
              disabled={registrando !== null}
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              {registrando === "RECUSADA" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <ThumbsDown className="mr-1.5 h-4 w-4" />
              )}
              Cliente recusou
            </Button>
          </>
        )}

        {/* Sobrescrever — só Diretor/Admin, e só se quiser mesmo */}
        {podeSobrescrever && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (
                confirm(
                  "Gerar a proposta de novo substitui a trava atual e reseta a decisão do cliente registrada. Confirma?"
                )
              ) {
                gerar();
              }
            }}
            disabled={gerando}
            title="Só Diretor/Admin pode gerar de novo"
          >
            {gerando ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-1.5 h-4 w-4" />
            )}
            Gerar novamente
          </Button>
        )}
      </div>
    );
  }

  // Ainda não gerada, mas liberada — botão normal.
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={gerar} disabled={gerando}>
        {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        Gerar Proposta Comercial
      </Button>
    </div>
  );
}
