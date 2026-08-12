export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Busca dados de CNPJ na BrasilAPI (gratuita, sem chave) e retorna só
 * os campos relevantes pro preenchimento automático dos formulários.
 * Pedido pelo Henrique em 11/08/2026.
 */
export async function GET(_req: NextRequest, { params }: { params: { cnpj: string } }) {
  const cnpjLimpo = params.cnpj.replace(/\D/g, "");

  if (cnpjLimpo.length !== 14) {
    return NextResponse.json({ erro: "CNPJ precisa ter 14 dígitos." }, { status: 400 });
  }

  try {
    const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!resposta.ok) {
      return NextResponse.json({ erro: "CNPJ não encontrado ou inválido." }, { status: 404 });
    }

    const dados = await resposta.json();

    return NextResponse.json({
      razaoSocial: dados.razao_social ?? null,
      nomeFantasia: dados.nome_fantasia ?? null,
      telefone: dados.ddd_telefone_1 ?? null,
      email: dados.email ?? null,
      logradouro:
        dados.logradouro && dados.descricao_tipo_de_logradouro
          ? `${dados.descricao_tipo_de_logradouro} ${dados.logradouro}`
          : (dados.logradouro ?? null),
      numero: dados.numero ?? null,
      cidade: dados.municipio ?? null,
      estado: dados.uf ?? null,
      cep: dados.cep ?? null,
    });
  } catch {
    return NextResponse.json({ erro: "Não foi possível consultar o CNPJ agora. Tenta de novo em instantes." }, { status: 502 });
  }
}
