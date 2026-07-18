import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { prisma } from "@/infra/db/prisma/client";
import { EmpreendimentoSubNav } from "@/features/empreendimentos/components/empreendimento-sub-nav";
import { RestaurarEmpreendimentoButton } from "@/features/empreendimentos/components/restaurar-empreendimento-button";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

export default async function EmpreendimentoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  // [CORREÇÃO C2/C3.1] Sem filtro de excluidoEm aqui de propósito — a
  // página de detalhe permite consulta somente leitura de empreendimentos
  // arquivados (ponto 8 do plano aprovado). O bloqueio de operações de
  // escrita acontece individualmente em cada action, não aqui.
  const empreendimento = await prisma.empreendimento.findUnique({
    where: { id: params.id },
    select: { kitEletrico: true, kitHidraulico: true, excluidoEm: true, nome: true },
  });
  if (!empreendimento) notFound();

  const podeRestaurar = await temPermissao(PERMISSOES.EMPREENDIMENTO_EXCLUIR);

  return (
    <div className="flex flex-col gap-6">
      {empreendimento.excluidoEm && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Empreendimento arquivado.</strong> Consulta somente leitura — novas
              operações (orçamento, levantamento, cotação, produção, remessa, documentos) estão
              bloqueadas até restaurar.
            </span>
          </div>
          {podeRestaurar && <RestaurarEmpreendimentoButton empreendimentoId={params.id} />}
        </div>
      )}
      <EmpreendimentoSubNav
        empreendimentoId={params.id}
        kitEletrico={empreendimento.kitEletrico}
        kitHidraulico={empreendimento.kitHidraulico}
      />
      {children}
    </div>
  );
}
