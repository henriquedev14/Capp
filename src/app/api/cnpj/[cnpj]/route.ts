export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Busca dados de CNPJ pra preencher formulários automaticamente.
 *
 * Tenta BrasilAPI primeiro, cai pra ReceitaWS se falhar — as duas são
 * gratuitas e sem chave, mas ambas têm limite de requisições por
 * minuto, então o fallback evita que um pico de uso trave todo mundo.
 *
 * IMPORTANTE (achado em 12/08/2026): a versão anterior transformava
 * QUALQUER falha (limite excedido, rede bloqueada, timeout) na
 * mensagem "CNPJ não encontrado ou inválido" — o que fazia todo CNPJ
 * parecer inválido e escondia a causa real. Agora cada erro tem sua
 * própria mensagem.
 */

interface DadosCnpj {
  razaoSocial: string | null;
  nomeFantasia: string | null;
  telefone: string | null;
  email: string | null;
  logradouro: string | null;
  numero: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

async function tentarBrasilApi(cnpj: string): Promise<{ dados: DadosCnpj } | { erro: string; status: number }> {
  const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (resposta.status === 404) {
    return { erro: "CNPJ não encontrado na Receita Federal. Confere se digitou certo.", status: 404 };
  }
  if (resposta.status === 429) {
    return { erro: "LIMITE", status: 429 };
  }
  if (!resposta.ok) {
    return { erro: "FALHA", status: resposta.status };
  }

  const d = await resposta.json();
  return {
    dados: {
      razaoSocial: d.razao_social ?? null,
      nomeFantasia: d.nome_fantasia ?? null,
      telefone: d.ddd_telefone_1 ?? null,
      email: d.email ?? null,
      logradouro:
        d.logradouro && d.descricao_tipo_de_logradouro
          ? `${d.descricao_tipo_de_logradouro} ${d.logradouro}`
          : (d.logradouro ?? null),
      numero: d.numero ?? null,
      cidade: d.municipio ?? null,
      estado: d.uf ?? null,
      cep: d.cep ?? null,
    },
  };
}

async function tentarReceitaWs(cnpj: string): Promise<{ dados: DadosCnpj } | { erro: string; status: number }> {
  const resposta = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!resposta.ok) return { erro: "FALHA", status: resposta.status };

  const d = await resposta.json();
  if (d.status === "ERROR") {
    return { erro: d.message ?? "CNPJ não encontrado.", status: 404 };
  }

  return {
    dados: {
      razaoSocial: d.nome ?? null,
      nomeFantasia: d.fantasia ?? null,
      telefone: d.telefone ?? null,
      email: d.email ?? null,
      logradouro: d.logradouro ?? null,
      numero: d.numero ?? null,
      cidade: d.municipio ?? null,
      estado: d.uf ?? null,
      cep: d.cep ?? null,
    },
  };
}

export async function GET(_req: NextRequest, { params }: { params: { cnpj: string } }) {
  const cnpj = params.cnpj.replace(/\D/g, "");

  if (cnpj.length !== 14) {
    return NextResponse.json({ erro: "CNPJ precisa ter 14 dígitos." }, { status: 400 });
  }

  let motivoPrimeiraFalha = "";

  try {
    const r = await tentarBrasilApi(cnpj);
    if ("dados" in r) return NextResponse.json(r.dados);
    if (r.status === 404) return NextResponse.json({ erro: r.erro }, { status: 404 });
    motivoPrimeiraFalha = r.erro === "LIMITE" ? "limite de consultas" : `erro ${r.status}`;
  } catch (e) {
    motivoPrimeiraFalha = e instanceof Error && e.name === "TimeoutError" ? "tempo esgotado" : "sem conexão";
  }

  // Fallback — segunda fonte
  try {
    const r = await tentarReceitaWs(cnpj);
    if ("dados" in r) return NextResponse.json(r.dados);
    if (r.status === 404) return NextResponse.json({ erro: r.erro }, { status: 404 });
  } catch {
    // cai pro erro final abaixo
  }

  return NextResponse.json(
    {
      erro: `As duas fontes de consulta falharam (${motivoPrimeiraFalha}). Isso não quer dizer que o CNPJ é inválido — pode ser limite de consultas. Tenta de novo em um minuto ou preenche na mão.`,
    },
    { status: 503 }
  );
}
