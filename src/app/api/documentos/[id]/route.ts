export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/infra/db/prisma/client";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

// Serve o conteúdo binário de um DocumentoEmpreendimento salvo direto no
// banco (campo `conteudo`). Usado hoje pelas propostas comerciais geradas —
// a cópia exata que foi travada/anexada na timeline, diferente da rota de
// visualização ao vivo que sempre re-renderiza com os dados atuais.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirPermissao(PERMISSOES.EMPREENDIMENTO_VER);
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "Não autorizado." },
      { status: 401 }
    );
  }

  const doc = await prisma.documentoEmpreendimento.findUnique({
    where: { id: params.id },
    select: { nome: true, tipo: true, conteudo: true },
  });

  if (!doc || !doc.conteudo) {
    return NextResponse.json({ erro: "Documento não encontrado." }, { status: 404 });
  }

  // Segurança: só exibimos "inline" tipos que sabemos ser seguros pro
  // navegador renderizar direto (imagem, PDF). Qualquer outro tipo — em
  // especial HTML/SVG/JS, que poderiam rodar script dentro do domínio do
  // sistema se abertos inline (XSS armazenado via upload) — força
  // download em vez de exibir, e sempre com nosniff pra o navegador não
  // tentar adivinhar um tipo diferente do declarado.
  const TIPOS_SEGUROS_INLINE = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
  ];
  const tipo = doc.tipo ?? "application/octet-stream";
  const disposicao = TIPOS_SEGUROS_INLINE.includes(tipo) ? "inline" : "attachment";

  return new NextResponse(new Uint8Array(doc.conteudo), {
    headers: {
      "Content-Type": tipo,
      "Content-Disposition": `${disposicao}; filename="${doc.nome}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
