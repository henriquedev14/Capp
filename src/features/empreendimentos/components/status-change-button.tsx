"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, ArrowRight, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/features/empreendimentos/components/status-badge";
import { STATUS_EMPREENDIMENTO, getStatusOption } from "@/features/empreendimentos/constants";
import { mudarStatusEmpreendimento } from "@/features/empreendimentos/actions/empreendimento-actions";
import type { Empreendimento } from "@/core/empreendimentos/entities/empreendimento";

interface StatusChangeButtonProps {
  empreendimentoId: string;
  statusAtual: string;
  /** Se true, mostra TODOS os status (Admin/Diretor). Se false, só os próximos naturais. */
  podeAlterarLivremente?: boolean;
}

export function StatusChangeButton({
  empreendimentoId,
  statusAtual,
  podeAlterarLivremente = false,
}: StatusChangeButtonProps) {
  const router = useRouter();
  const [alterando, setAlterando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const statusAtualOption = getStatusOption(statusAtual);
  const proximosNaturais = statusAtualOption?.proximos ?? [];

  // Usuário comum só vê os próximos naturais. Admin/Diretor veem todos,
  // separados em "Próximo natural" e "Pular etapa (Admin/Diretor)".
  const statusDisponiveis = podeAlterarLivremente
    ? STATUS_EMPREENDIMENTO.filter((s) => s.value !== statusAtual)
    : STATUS_EMPREENDIMENTO.filter((s) => proximosNaturais.includes(s.value));

  // O "próximo natural" é sempre o PRIMEIRO item declarado no array
  // `proximos` daquele status (constants.ts) — é o que representa avançar
  // de verdade. Antes, isso vinha de filtrar a lista geral STATUS_EMPREENDIMENTO
  // (ordenada por fase do funil), o que quebrava justamente em NEGOCIACAO:
  // como "proximos" inclui tanto CONTRATADO (avançar) quanto ORCAMENTACAO
  // (voltar pra reajustar), e ORCAMENTACAO aparece antes na lista geral, o
  // botão principal virava "Avançar para Orçamentação" — parecia um loop.
  const proximoNatural =
    proximosNaturais.length > 0
      ? STATUS_EMPREENDIMENTO.find((s) => s.value === proximosNaturais[0])
      : undefined;

  async function handleMudarStatus(novoStatus: string, ehPulandoEtapa = false) {
    if (novoStatus === statusAtual) return;

    // "Pular etapa" pode saltar por cima de gatilhos automáticos
    // importantes (ex: pular direto pra Produção nunca passa por
    // Contratado, então a Conta a Receber nunca é criada; nunca passa
    // por Suprimentos, então o Marco Operacional de material completo
    // nunca é registrado). Isso é intencional pra corrigir casos
    // excepcionais, mas precisa ser uma escolha CONSCIENTE, não um
    // clique acidental — foi exatamente isso que gerou um empreendimento
    // em Produção sem nunca ter passado por Orçamento nem Suprimentos.
    if (ehPulandoEtapa) {
      const confirmado = window.confirm(
        `Pular direto pra "${getStatusOption(novoStatus)?.label ?? novoStatus}" ignora as etapas intermediárias e os gatilhos automáticos delas (ex: Conta a Receber só é criada ao passar por "Contratado"; medições de tempo só são registradas ao passar pelas etapas normais). Confirma que quer pular mesmo assim?`
      );
      if (!confirmado) return;
    }

    setErro(null);
    setAlterando(true);
    const resultado = await mudarStatusEmpreendimento(
      empreendimentoId,
      novoStatus as Empreendimento["status"]
    );
    setAlterando(false);
    if (resultado && "erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {/* Botão rápido de avanço para o próximo natural */}
        {proximoNatural && (
          <Button
            size="sm"
            onClick={() => handleMudarStatus(proximoNatural.value)}
            disabled={alterando}
            className="gap-1.5"
          >
            {alterando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" />
            )}
            Avançar para {proximoNatural.label}
          </Button>
        )}

        {/* Dropdown com mais opções (para Admin/Diretor, ou quando há mais de 1 próximo) */}
        {(podeAlterarLivremente || statusDisponiveis.length > 1) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={alterando}>
                {podeAlterarLivremente ? (
                  <SkipForward className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex items-center gap-2">
                Status atual: <StatusBadge status={statusAtual} />
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {podeAlterarLivremente ? (
                <>
                  {/* Próximos naturais */}
                  {statusDisponiveis
                    .filter((s) => proximosNaturais.includes(s.value))
                    .map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => handleMudarStatus(opt.value)}
                      >
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs text-muted-foreground">{opt.descricao}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}

                  {/* Pular etapas — separado visualmente */}
                  {statusDisponiveis.filter((s) => !proximosNaturais.includes(s.value)).length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                        Pular etapa (Admin / Diretor)
                      </DropdownMenuLabel>
                      {statusDisponiveis
                        .filter((s) => !proximosNaturais.includes(s.value))
                        .map((opt) => (
                          <DropdownMenuItem
                            key={opt.value}
                            onClick={() => handleMudarStatus(opt.value, true)}
                            className="text-muted-foreground"
                          >
                            <SkipForward className="h-4 w-4" />
                            <div className="flex flex-col">
                              <span className="font-medium">{opt.label}</span>
                              <span className="text-xs">{opt.descricao}</span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                    </>
                  )}
                </>
              ) : (
                statusDisponiveis.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => handleMudarStatus(opt.value)}
                  >
                    <StatusBadge status={opt.value} />
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {erro && <span className="text-xs text-destructive">{erro}</span>}
    </div>
  );
}
