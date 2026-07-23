"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { prisma } from "@/infra/db/prisma/client";
import { authOptions } from "@/infra/auth/auth-options.full";
import { exigirPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { verificarEmpreendimentoAtivo } from "@/infra/db/guardas/verificar-empreendimento-ativo";
import { consolidarLevantamentoMateriais } from "@/features/cotacoes/lib/consolidar-levantamento";
import { proximoNumeroCotacao } from "@/features/cotacoes/lib/numero-cotacao";

// --------------------------------------------------------------------------
// Preview de fornecedores para o modal "Gerar Cotação"
// --------------------------------------------------------------------------
// Retorna, pra cada fornecedor ativo:
//  - quantos itens do consolidado ELE cota (matching por ProdutoFornecedor)
//  - quantos itens do consolidado ele NÃO cota (não bloqueia — só oculta)
//  - se algum item cotável está com preço ZERADO (BLOQUEIA seleção)
//  - itens do consolidado que NENHUM fornecedor cadastrado cota (aviso geral)

export interface PreviewFornecedor {
  id: string;
  nome: string;
  totalProdutosCadastrados: number;
  itensCotaveis: number;
  itensNaoCotaveis: number;
  itensCotaveisSemPreco: {
    materialEletricoId: string;
    descricao: string;
    fabricante: string;
  }[];
}

export interface PreviewGeracao {
  totalItensConsolidados: number;
  itensSemFk: number;
  levantamentosValidados: number;
  fornecedores: PreviewFornecedor[];
  // Itens do consolidado que nenhum fornecedor tem cadastrado —
  // se o usuário só gerar com esses fornecedores, esses ficam de fora
  // de todas as cotações.
  itensNaoCotaveisPorNinguem: {
    materialEletricoId: string;
    descricao: string;
    fabricante: string;
    quantidade: number;
  }[];
}

export async function previewGeracaoCotacoes(orcamentoId: string): Promise<
  { erro: string } | PreviewGeracao
> {
  await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);

  const orcamento = await prisma.orcamento.findUnique({
    where: { id: orcamentoId },
    select: { empreendimentoId: true },
  });
  if (!orcamento) return { erro: "Orçamento não encontrado." };

  const consolidado = await consolidarLevantamentoMateriais(orcamento.empreendimentoId);
  if (consolidado.itens.length === 0) {
    return {
      erro:
        consolidado.levantamentosValidados === 0
          ? "Nenhum levantamento de materiais validado neste empreendimento. Valide pelo menos um antes de gerar cotações."
          : "O levantamento validado não tem itens.",
    };
  }

  const fornecedores = await prisma.fornecedor.findMany({
    where: { ativo: true },
    include: {
      _count: { select: { produtosOferecidos: { where: { ativo: true } } } },
      produtosOferecidos: {
        where: { ativo: true },
        select: {
          materialEletricoId: true,
          precoUnitario: true,
        },
      },
    },
    orderBy: { razaoSocial: "asc" },
  });

  const idsNoLevantamento = new Set(consolidado.itens.map((i) => i.materialEletricoId));

  // Ids cotados por AO MENOS um fornecedor
  const cotadosPorAlguem = new Set<string>();
  fornecedores.forEach((f) => {
    f.produtosOferecidos.forEach((p) => {
      if (idsNoLevantamento.has(p.materialEletricoId)) {
        cotadosPorAlguem.add(p.materialEletricoId);
      }
    });
  });

  const itensNaoCotaveisPorNinguem = consolidado.itens
    .filter((i) => !cotadosPorAlguem.has(i.materialEletricoId))
    .map((i) => ({
      materialEletricoId: i.materialEletricoId,
      descricao: i.descricao,
      fabricante: i.fabricante,
      quantidade: i.quantidade,
    }));

  const previewFornecedores: PreviewFornecedor[] = fornecedores.map((f) => {
    // Produtos deste fornecedor mapeados por materialEletricoId
    const mapa = new Map(
      f.produtosOferecidos.map((p) => [p.materialEletricoId, Number(p.precoUnitario)])
    );

    let cotaveis = 0;
    const semPreco: PreviewFornecedor["itensCotaveisSemPreco"] = [];

    for (const item of consolidado.itens) {
      if (!mapa.has(item.materialEletricoId)) continue;
      cotaveis++;
      const preco = mapa.get(item.materialEletricoId)!;
      if (preco <= 0) {
        semPreco.push({
          materialEletricoId: item.materialEletricoId,
          descricao: item.descricao,
          fabricante: item.fabricante,
        });
      }
    }

    return {
      id: f.id,
      nome: f.nomeFantasia ?? f.razaoSocial,
      totalProdutosCadastrados: f._count.produtosOferecidos,
      itensCotaveis: cotaveis,
      itensNaoCotaveis: consolidado.itens.length - cotaveis,
      itensCotaveisSemPreco: semPreco,
    };
  });

  return {
    totalItensConsolidados: consolidado.itens.length,
    itensSemFk: consolidado.itensSemFk,
    levantamentosValidados: consolidado.levantamentosValidados,
    fornecedores: previewFornecedores,
    itensNaoCotaveisPorNinguem,
  };
}

// --------------------------------------------------------------------------
// Gerar cotações — uma por fornecedor selecionado
// --------------------------------------------------------------------------

export interface ResultadoGeracao {
  erro?: string;
  detalhesBloqueio?: {
    fornecedorNome: string;
    itensSemPreco: { descricao: string; fabricante: string }[];
  }[];
  criadas?: { id: string; numero: string; fornecedorNome: string; totalItens: number }[];
}

export async function gerarCotacoes(
  orcamentoId: string,
  fornecedorIds: string[]
): Promise<ResultadoGeracao> {
  await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);

  if (fornecedorIds.length === 0) {
    return { erro: "Selecione ao menos um fornecedor." };
  }

  const session = await getServerSession(authOptions);
  const criadaPorId = session?.user?.id ?? null;

  const orcamento = await prisma.orcamento.findUnique({
    where: { id: orcamentoId },
    select: { empreendimentoId: true },
  });
  if (!orcamento) return { erro: "Orçamento não encontrado." };

  const bloqueio = await verificarEmpreendimentoAtivo(orcamento.empreendimentoId);
  if (!bloqueio.permitido) return { erro: bloqueio.motivo! };

  const consolidado = await consolidarLevantamentoMateriais(orcamento.empreendimentoId);
  if (consolidado.itens.length === 0) {
    return { erro: "Nenhum item consolidado — valide o levantamento primeiro." };
  }

  const fornecedores = await prisma.fornecedor.findMany({
    where: { id: { in: fornecedorIds }, ativo: true },
    include: {
      produtosOferecidos: {
        where: { ativo: true },
        select: {
          materialEletricoId: true,
          precoUnitario: true,
        },
      },
    },
  });

  // Validação: bloqueia se algum fornecedor tem produto cotável com preço zerado.
  const bloqueios: NonNullable<ResultadoGeracao["detalhesBloqueio"]> = [];
  for (const f of fornecedores) {
    const mapa = new Map(
      f.produtosOferecidos.map((p) => [p.materialEletricoId, Number(p.precoUnitario)])
    );
    const semPreco: { descricao: string; fabricante: string }[] = [];
    for (const item of consolidado.itens) {
      if (!mapa.has(item.materialEletricoId)) continue;
      if ((mapa.get(item.materialEletricoId) ?? 0) <= 0) {
        semPreco.push({ descricao: item.descricao, fabricante: item.fabricante });
      }
    }
    if (semPreco.length > 0) {
      bloqueios.push({
        fornecedorNome: f.nomeFantasia ?? f.razaoSocial,
        itensSemPreco: semPreco,
      });
    }
  }

  if (bloqueios.length > 0) {
    return {
      erro:
        "Há fornecedores com produtos cadastrados sem preço. Preencha os preços antes de gerar as cotações.",
      detalhesBloqueio: bloqueios,
    };
  }

  // Cria uma cotação por fornecedor. Cada uma dentro de uma transação
  // pra evitar cotação "meio criada" se algum item der erro no meio.
  const criadas: NonNullable<ResultadoGeracao["criadas"]> = [];

  for (const f of fornecedores) {
    const mapa = new Map(
      f.produtosOferecidos.map((p) => [p.materialEletricoId, Number(p.precoUnitario)])
    );

    const itensCotaveis = consolidado.itens.filter((i) => mapa.has(i.materialEletricoId));
    const itensNaoCotaveis = consolidado.itens.filter((i) => !mapa.has(i.materialEletricoId));

    if (itensCotaveis.length === 0) {
      // Fornecedor não tem NENHUM item — pula silenciosamente (regra 2)
      continue;
    }

    const numero = await proximoNumeroCotacao();

    // Totais separados por kit pra bater com o cabeçalho do documento QDC
    let totalEletrica = 0;
    let totalQdc = 0;
    const itensParaCriar = itensCotaveis.map((item, idx) => {
      const precoUn = mapa.get(item.materialEletricoId)!;
      const total = precoUn * item.quantidade;
      if (item.kit === "QDC") totalQdc += total;
      else totalEletrica += total;
      return {
        materialEletricoId: item.materialEletricoId,
        descricao: item.descricao,
        fabricante: item.fabricante,
        unidade: item.unidade,
        kit: item.kit,
        quantidade: item.quantidade,
        precoUnitario: precoUn,
        total,
        ordem: idx,
      };
    });

    const cotacaoCriada = await prisma.cotacao.create({
      data: {
        orcamentoId,
        fornecedorId: f.id,
        numero,
        status: "RASCUNHO",
        totalEletrica,
        totalQdc,
        totalGeral: totalEletrica + totalQdc,
        criadaPorId,
        itensNaoCotaveis:
          itensNaoCotaveis.length > 0
            ? JSON.stringify(
                itensNaoCotaveis.map((i) => ({
                  descricao: i.descricao,
                  fabricante: i.fabricante,
                  quantidade: i.quantidade,
                  kit: i.kit,
                }))
              )
            : null,
        itens: { create: itensParaCriar },
      },
      select: { id: true, numero: true },
    });

    criadas.push({
      id: cotacaoCriada.id,
      numero: cotacaoCriada.numero,
      fornecedorNome: f.nomeFantasia ?? f.razaoSocial,
      totalItens: itensCotaveis.length,
    });
  }

  if (criadas.length === 0) {
    return { erro: "Nenhum fornecedor selecionado cota algum item do levantamento." };
  }

  const empreendimentoId = orcamento.empreendimentoId;
  revalidatePath(`/empreendimentos/${empreendimentoId}/orcamento`);

  return { criadas };
}

// --------------------------------------------------------------------------
// Editar preço unitário de um item da cotação (na tela de detalhe)
// --------------------------------------------------------------------------

export async function atualizarPrecoCotacaoItem(
  itemId: string,
  novoPreco: number
): Promise<{ erro?: string; ok?: boolean }> {
  await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);

  if (!Number.isFinite(novoPreco) || novoPreco < 0) {
    return { erro: "Preço inválido." };
  }

  const item = await prisma.cotacaoItem.findUnique({
    where: { id: itemId },
    select: {
      cotacao: {
        select: { id: true, status: true, orcamentoId: true, orcamento: { select: { empreendimentoId: true } } },
      },
      quantidade: true,
    },
  });
  if (!item) return { erro: "Item não encontrado." };

  const bloqueio = await verificarEmpreendimentoAtivo(item.cotacao.orcamento.empreendimentoId);
  if (!bloqueio.permitido) return { erro: bloqueio.motivo! };

  // Cotação aceita ou recusada é imutável
  if (item.cotacao.status === "ACEITA" || item.cotacao.status === "RECUSADA") {
    return { erro: "Não é possível editar preços de uma cotação já finalizada." };
  }

  const novoTotal = novoPreco * Number(item.quantidade);

  await prisma.$transaction(async (tx) => {
    await tx.cotacaoItem.update({
      where: { id: itemId },
      data: { precoUnitario: novoPreco, total: novoTotal },
    });

    // Recalcula os totais da cotação depois de mudar um preço.
    const itens = await tx.cotacaoItem.findMany({
      where: { cotacaoId: item.cotacao.id },
      select: { total: true, kit: true },
    });
    let totalEletrica = 0;
    let totalQdc = 0;
    for (const i of itens) {
      const t = Number(i.total);
      if (i.kit === "QDC") totalQdc += t;
      else totalEletrica += t;
    }
    await tx.cotacao.update({
      where: { id: item.cotacao.id },
      data: {
        totalEletrica,
        totalQdc,
        totalGeral: totalEletrica + totalQdc,
      },
    });
  });

  return { ok: true };
}

// --------------------------------------------------------------------------
// Mudar status da cotação
// --------------------------------------------------------------------------

export async function mudarStatusCotacao(
  cotacaoId: string,
  novoStatus: "RASCUNHO" | "ENVIADA" | "RESPONDIDA" | "ACEITA" | "RECUSADA"
): Promise<{ erro?: string; ok?: boolean }> {
  await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);

  const cotacao = await prisma.cotacao.findUnique({
    where: { id: cotacaoId },
    select: { status: true, orcamentoId: true, orcamento: { select: { empreendimentoId: true } } },
  });
  if (!cotacao) return { erro: "Cotação não encontrada." };

  const bloqueio = await verificarEmpreendimentoAtivo(cotacao.orcamento.empreendimentoId);
  if (!bloqueio.permitido) return { erro: bloqueio.motivo! };

  // Regras de transição minimalistas: só bloqueia mudança PARA ACEITA/RECUSADA
  // se já existe uma ACEITA no mesmo orçamento (só uma vencedora por vez).
  if (novoStatus === "ACEITA") {
    const outraAceita = await prisma.cotacao.findFirst({
      where: {
        orcamentoId: cotacao.orcamentoId,
        status: "ACEITA",
        NOT: { id: cotacaoId },
      },
      select: { id: true, numero: true },
    });
    if (outraAceita) {
      return {
        erro: `Já existe outra cotação aceita neste orçamento (${outraAceita.numero}). Recuse-a antes de aceitar esta.`,
      };
    }
  }

  await prisma.cotacao.update({
    where: { id: cotacaoId },
    data: { status: novoStatus },
  });

  // Cotação aceita alimenta o preço de volta pro Bloco 2 (materiais do
  // orçamento) E pro catálogo (pra futuras sugestões já saírem com o
  // preço negociado). Sem isso, o orçamento aprovado podia ficar com
  // preço desatualizado mesmo depois de fechar cotação com fornecedor —
  // ninguém precisa lembrar de atualizar na mão.
  if (novoStatus === "ACEITA") {
    const itensCotacao = await prisma.cotacaoItem.findMany({
      where: { cotacaoId },
      select: { materialEletricoId: true, descricao: true, precoUnitario: true },
    });

    for (const itemCot of itensCotacao) {
      const precoNegociado = Number(itemCot.precoUnitario);

      // Atualiza o catálogo global — próximas sugestões/orçamentos já
      // saem com o preço negociado.
      if (itemCot.materialEletricoId) {
        await prisma.materialEletrico.update({
          where: { id: itemCot.materialEletricoId },
          data: { precoUnitario: precoNegociado },
        }).catch(() => {
          // Material pode ter sido excluído do catálogo depois — não
          // impede o resto da atualização.
        });
      }

      // Atualiza o item correspondente NESTE orçamento (Bloco 2) — casa
      // por materialEletricoId quando existe; senão, por descrição igual
      // (item avulso, sem vínculo de catálogo).
      const itemOrcamento = await prisma.itemMaterialOrcamento.findFirst({
        where: {
          orcamentoId: cotacao.orcamentoId,
          ...(itemCot.materialEletricoId
            ? { materialEletricoId: itemCot.materialEletricoId }
            : { materialEletricoId: null, descricao: itemCot.descricao }),
        },
        select: { id: true, quantidade: true },
      });
      if (itemOrcamento) {
        const novoTotal = Number(itemOrcamento.quantidade) * precoNegociado;
        await prisma.itemMaterialOrcamento.update({
          where: { id: itemOrcamento.id },
          data: { precoUnitario: precoNegociado, total: novoTotal },
        });
      }
    }

    // Recalcula o total de materiais do orçamento com os preços novos.
    const itensAtualizados = await prisma.itemMaterialOrcamento.findMany({
      where: { orcamentoId: cotacao.orcamentoId },
      select: { total: true },
    });
    const totalMateriais = itensAtualizados.reduce((acc, i) => acc + Number(i.total ?? 0), 0);
    await prisma.orcamento.update({
      where: { id: cotacao.orcamentoId },
      data: { totalMateriais },
    });
  }

  revalidatePath(`/empreendimentos/${cotacao.orcamento.empreendimentoId}/orcamento`);
  return { ok: true };
}

// --------------------------------------------------------------------------
// Deletar cotação
// --------------------------------------------------------------------------

export async function deletarCotacao(
  cotacaoId: string
): Promise<{ erro?: string; ok?: boolean }> {
  await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);

  const cotacao = await prisma.cotacao.findUnique({
    where: { id: cotacaoId },
    select: { status: true, orcamento: { select: { empreendimentoId: true } } },
  });
  if (!cotacao) return { erro: "Cotação não encontrada." };

  const bloqueio = await verificarEmpreendimentoAtivo(cotacao.orcamento.empreendimentoId);
  if (!bloqueio.permitido) return { erro: bloqueio.motivo! };

  if (cotacao.status === "ACEITA") {
    return { erro: "Não é possível deletar uma cotação aceita. Recuse-a primeiro." };
  }

  await prisma.cotacao.delete({ where: { id: cotacaoId } });

  revalidatePath(`/empreendimentos/${cotacao.orcamento.empreendimentoId}/orcamento`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Import de PDF de resposta do fornecedor — sugere o item da cotação que
// cada linha extraída do PDF provavelmente corresponde, por sobreposição
// de palavras (mesmo princípio já usado no import de Nota Fiscal).
// ---------------------------------------------------------------------------

function normalizarTextoCotacao(v: string): string {
  return v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface SugestaoItemCotacao {
  cotacaoItemId: string;
  descricao: string;
  quantidade: number;
  precoAtual: number;
  /** Material do catálogo interno ligado a este item — usado pra aprender o código do fornecedor. */
  materialEletricoId: string | null;
}

/**
 * Pra cada descrição extraída do PDF do fornecedor, acha o item da
 * cotação (já existente, vindo do levantamento) que mais bate por
 * sobreposição de palavras. Não aplica nada sozinho — só sugere, a
 * pessoa confirma ou troca na tela de revisão.
 */
export async function sugerirItemCotacaoPorDescricao(
  cotacaoId: string,
  descricao: string
): Promise<SugestaoItemCotacao | null> {
  const itens = await prisma.cotacaoItem.findMany({
    where: { cotacaoId },
    select: { id: true, descricao: true, quantidade: true, precoUnitario: true, materialEletricoId: true },
  });

  const palavrasDescricao = new Set(
    normalizarTextoCotacao(descricao).split(" ").filter((p) => p.length > 2)
  );
  if (palavrasDescricao.size === 0) return null;

  let melhor: { id: string; descricao: string; quantidade: number; precoUnitario: number; materialEletricoId: string | null; pontuacao: number } | null = null;
  for (const item of itens) {
    const palavrasItem = normalizarTextoCotacao(item.descricao).split(" ").filter((p) => p.length > 2);
    const pontuacao = palavrasItem.filter((p) => palavrasDescricao.has(p)).length;
    if (pontuacao > 0 && (!melhor || pontuacao > melhor.pontuacao)) {
      melhor = { id: item.id, descricao: item.descricao, quantidade: Number(item.quantidade), precoUnitario: Number(item.precoUnitario), materialEletricoId: item.materialEletricoId, pontuacao };
    }
  }

  return melhor
    ? { cotacaoItemId: melhor.id, descricao: melhor.descricao, quantidade: melhor.quantidade, precoAtual: melhor.precoUnitario, materialEletricoId: melhor.materialEletricoId }
    : null;
}

/**
 * Match por código do fornecedor (SKU) — muito mais confiável que
 * descrição quando disponível, porque o código é sempre texto extraível
 * no PDF (mesmo quando a descrição não é — ver diagnóstico em
 * extrair-precos-cotacao.ts) e é um identificador exato, sem ambiguidade
 * de palavras em comum. Só funciona depois que o código já foi aprendido
 * uma vez (ver `salvarCodigoFornecedorParaMaterial`).
 */
export async function sugerirItemCotacaoPorCodigo(
  cotacaoId: string,
  fornecedorId: string,
  codigo: string
): Promise<SugestaoItemCotacao | null> {
  const mapeamento = await prisma.produtoFornecedor.findFirst({
    where: { fornecedorId, codigoFornecedor: codigo },
    select: { materialEletricoId: true },
  });
  if (!mapeamento) return null;

  const item = await prisma.cotacaoItem.findFirst({
    where: { cotacaoId, materialEletricoId: mapeamento.materialEletricoId },
    select: { id: true, descricao: true, quantidade: true, precoUnitario: true, materialEletricoId: true },
  });
  if (!item) return null;

  return {
    cotacaoItemId: item.id,
    descricao: item.descricao,
    quantidade: Number(item.quantidade),
    precoAtual: Number(item.precoUnitario),
    materialEletricoId: item.materialEletricoId,
  };
}

/**
 * Ponto de entrada único usado pela tela de importação: tenta código
 * primeiro (mais confiável, exato), cai pra descrição se não achar
 * mapeamento aprendido ainda pra esse código.
 */
export async function sugerirItemCotacaoParaImport(
  cotacaoId: string,
  fornecedorId: string,
  input: { codigo?: string; descricao: string }
): Promise<SugestaoItemCotacao | null> {
  if (input.codigo) {
    const porCodigo = await sugerirItemCotacaoPorCodigo(cotacaoId, fornecedorId, input.codigo);
    if (porCodigo) return porCodigo;
  }
  return sugerirItemCotacaoPorDescricao(cotacaoId, input.descricao);
}

/**
 * Aprende (ou atualiza) o código do fornecedor pra um material — chamada
 * quando a pessoa confirma/corrige um match manualmente na tela de
 * revisão. Da próxima vez que importar um PDF desse mesmo fornecedor,
 * esse item casa sozinho por código, sem depender de descrição.
 */
export async function salvarCodigoFornecedorParaMaterial(
  fornecedorId: string,
  codigo: string,
  materialEletricoId: string
): Promise<{ erro?: string; ok?: boolean }> {
  await exigirPermissao(PERMISSOES.EMPREENDIMENTO_EDITAR);

  if (!codigo.trim()) return { erro: "Código vazio." };

  try {
    await prisma.produtoFornecedor.upsert({
      where: { fornecedorId_materialEletricoId: { fornecedorId, materialEletricoId } },
      create: { fornecedorId, materialEletricoId, codigoFornecedor: codigo },
      update: { codigoFornecedor: codigo },
    });
  } catch (e) {
    // Conflito de unique(fornecedorId, codigoFornecedor): esse código já
    // está aprendido pra OUTRO material desse fornecedor. Não é um erro
    // grave — só significa que não dá pra aprender de novo (mantém o
    // aprendizado anterior intacto), a pessoa segue usando o dropdown
    // manual pra esse item específico.
    console.error("[salvarCodigoFornecedorParaMaterial] conflito ao salvar código:", e);
    return { erro: "Esse código já está associado a outro material desse fornecedor." };
  }

  return { ok: true };
}

/** Lista todos os itens da cotação — pra popular o dropdown de "trocar item" na revisão. */
export async function listarItensCotacaoParaImport(cotacaoId: string): Promise<SugestaoItemCotacao[]> {
  const itens = await prisma.cotacaoItem.findMany({
    where: { cotacaoId },
    select: { id: true, descricao: true, quantidade: true, precoUnitario: true, materialEletricoId: true },
    orderBy: { ordem: "asc" },
  });
  return itens.map((i) => ({
    cotacaoItemId: i.id,
    descricao: i.descricao,
    quantidade: Number(i.quantidade),
    precoAtual: Number(i.precoUnitario),
    materialEletricoId: i.materialEletricoId,
  }));
}

// ---------------------------------------------------------------------------
// Import de PDF direto pela página do Fornecedor — identifica sozinho
// qual cotação pendente desse fornecedor bate melhor com os itens do PDF.
// ---------------------------------------------------------------------------

export interface CotacaoPendenteFornecedor {
  cotacaoId: string;
  numero: string;
  empreendimentoNome: string;
  quantidadeItens: number;
}

/** Lista cotações desse fornecedor que ainda podem receber resposta (não aceitas/recusadas). */
export async function listarCotacoesPendentesDoFornecedor(
  fornecedorId: string
): Promise<CotacaoPendenteFornecedor[]> {
  const cotacoes = await prisma.cotacao.findMany({
    where: { fornecedorId, status: { notIn: ["ACEITA", "RECUSADA"] } },
    include: {
      orcamento: { select: { empreendimento: { select: { nome: true } } } },
      itens: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return cotacoes.map((c) => ({
    cotacaoId: c.id,
    numero: c.numero,
    empreendimentoNome: c.orcamento.empreendimento.nome,
    quantidadeItens: c.itens.length,
  }));
}

/**
 * Dado o texto extraído de um PDF, acha qual das cotações pendentes desse
 * fornecedor bate melhor — soma a pontuação de sobreposição de palavras
 * de TODAS as linhas do PDF contra os itens de cada cotação, e escolhe a
 * de maior pontuação total. Não decide sozinho de forma definitiva: a
 * tela de revisão sempre mostra qual foi escolhida e permite trocar.
 */
export async function identificarMelhorCotacao(
  fornecedorId: string,
  descricoesExtraidas: string[]
): Promise<{ cotacaoId: string; pontuacao: number } | null> {
  const cotacoes = await prisma.cotacao.findMany({
    where: { fornecedorId, status: { notIn: ["ACEITA", "RECUSADA"] } },
    include: { itens: { select: { descricao: true } } },
  });
  if (cotacoes.length === 0) return null;
  if (cotacoes.length === 1) return { cotacaoId: cotacoes[0]!.id, pontuacao: 1 };

  const palavrasExtraidas = descricoesExtraidas.map(
    (d) => new Set(normalizarTextoCotacao(d).split(" ").filter((p) => p.length > 2))
  );

  let melhor: { cotacaoId: string; pontuacao: number } | null = null;
  for (const cotacao of cotacoes) {
    let pontuacaoTotal = 0;
    for (const item of cotacao.itens) {
      const palavrasItem = new Set(normalizarTextoCotacao(item.descricao).split(" ").filter((p) => p.length > 2));
      for (const palavrasLinha of palavrasExtraidas) {
        for (const p of palavrasLinha) {
          if (palavrasItem.has(p)) pontuacaoTotal++;
        }
      }
    }
    if (!melhor || pontuacaoTotal > melhor.pontuacao) {
      melhor = { cotacaoId: cotacao.id, pontuacao: pontuacaoTotal };
    }
  }
  return melhor;
}
