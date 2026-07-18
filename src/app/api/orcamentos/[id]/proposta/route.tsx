export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { renderizarPropostaPdf } from "@/features/orcamentacao/lib/renderizar-proposta";

// Visualização ao vivo — sempre reflete o estado atual do orçamento.
// A cópia "oficial" (anexada na timeline no momento em que o botão
// "Gerar Proposta Comercial" é clicado) é feita à parte pela action
// gerarPropostaComercial, que persiste os bytes exatos daquele instante.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  let sessao;
  try {
    sessao = await exigirPermissao(PERMISSOES.EMPREENDIMENTO_VER);
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "Não autorizado." },
      { status: 401 }
    );
  }

  const resultado = await renderizarPropostaPdf(params.id, sessao.user.id);

  if ("erro" in resultado) {
    return NextResponse.json({ erro: resultado.erro }, { status: 400 });
  }

  return new NextResponse(new Uint8Array(resultado.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${resultado.nomeArquivo}"`,
    },
  });
}
