"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock, LockOpen, Pencil, Send, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { atualizarStatusOrcamento } from "@/features/orcamentacao/actions/orcamento-actions";
import type { StatusOrcamento } from "@/core/orcamentacao/entities/orcamento";

interface MudarStatusButtonProps {
  orcamentoId: string;
  empreendimentoId: string;
  statusAtual: StatusOrcamento;
  // Só Diretor/Coordenador podem aprovar, devolver ou reabrir um orçamento
  // aprovado — qualquer um com permissão de editar pode enviar para
  // aprovação ou retomar um orçamento devolvido.
  podeAprovar: boolean;
}

type Variante = "default" | "outline";

// Cada situação lista os botões diretos que devem aparecer, em ordem visual.
// A action `atualizarStatusOrcamento` já valida permissão no servidor — a
// flag `gestor` aqui é só pra esconder o botão de quem obviamente não pode
// usá-lo.
const BOTOES_POR_STATUS: Record<
  StatusOrcamento,
  {
    status: StatusOrcamento;
    label: string;
    variant: Variante;
    gestor: boolean;
    Icon: React.ComponentType<{ className?: string }>;
  }[]
> = {
  EM_LEVANTAMENTO: [
    {
      status: "ENVIADO_APROVACAO_GESTOR",
      label: "Concluir e Enviar para Gestor",
      variant: "default",
      gestor: false,
      Icon: Send,
    },
  ],
  ENVIADO_APROVACAO_GESTOR: [
    {
      status: "ORCAMENTO_APROVADO",
      label: "Aprovar",
      variant: "default",
      gestor: true,
      Icon: Check,
    },
    {
      status: "ORCAMENTO_DEVOLVIDO",
      label: "Devolver",
      variant: "outline",
      gestor: true,
      Icon: Undo2,
    },
  ],
  ORCAMENTO_DEVOLVIDO: [
    {
      status: "EM_LEVANTAMENTO",
      label: "Retomar edição",
      variant: "default",
      gestor: false,
      Icon: Pencil,
    },
  ],
  ORCAMENTO_APROVADO: [
    {
      status: "EM_LEVANTAMENTO",
      label: "Reabrir para edição",
      variant: "outline",
      gestor: true,
      Icon: LockOpen,
    },
  ],
};

export function MudarStatusButton({
  orcamentoId,
  empreendimentoId,
  statusAtual,
  podeAprovar,
}: MudarStatusButtonProps) {
  // Guarda qual botão está em loading pra desabilitar só ele (útil quando
  // aparecem dois botões lado a lado, como em ENVIADO_APROVACAO_GESTOR).
  const [statusEmAcao, setStatusEmAcao] = React.useState<StatusOrcamento | null>(null);
  const router = useRouter();

  // Cadeado para não-gestor quando o orçamento já está aprovado.
  if (statusAtual === "ORCAMENTO_APROVADO" && !podeAprovar) {
    return (
      <span className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        Aprovado — só um gestor pode reabrir
      </span>
    );
  }

  const botoes = (BOTOES_POR_STATUS[statusAtual] ?? []).filter(
    (b) => !b.gestor || podeAprovar
  );

  if (botoes.length === 0) return null;

  async function mudar(novoStatus: StatusOrcamento) {
    setStatusEmAcao(novoStatus);
    const resultado = await atualizarStatusOrcamento(orcamentoId, empreendimentoId, novoStatus);
    if ("erro" in resultado) {
      setStatusEmAcao(null);
      alert(resultado.erro);
      return;
    }
    router.refresh();
    // Não zeramos statusEmAcao aqui — o refresh vai remontar o componente
    // com o novo status e a lista de botões correta. Se zerarmos antes, o
    // botão volta a ficar clicável por um frame durante o refresh.
  }

  const algumEmAcao = statusEmAcao !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {botoes.map(({ status, label, variant, Icon }) => {
        const esteEmAcao = statusEmAcao === status;
        return (
          <Button
            key={status}
            variant={variant}
            size="sm"
            disabled={algumEmAcao}
            onClick={() => mudar(status)}
          >
            {esteEmAcao ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="mr-1.5 h-4 w-4" />
            )}
            {esteEmAcao ? "Processando..." : label}
          </Button>
        );
      })}
    </div>
  );
}
