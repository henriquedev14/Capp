import { prisma } from "./client";
import { montarAnexoMateriaisPorFornecedor } from "@/features/orcamentacao/lib/proposta-anexo-materiais";

async function main() {
  const orcamento = await prisma.orcamento.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      empreendimento: { select: { nome: true } },
      itensMaterial: true,
    },
  });

  if (!orcamento) {
    console.log("Nenhum orçamento encontrado.");
    return;
  }

  console.log(`Orçamento mais recente: ${orcamento.empreendimento.nome} (revisão ${orcamento.revisao})`);
  console.log(`Total de itensMaterial no banco: ${orcamento.itensMaterial.length}\n`);

  const fornecedoresIds = orcamento.itensMaterial
    .map((i) => i.fornecedorSelecionadoId)
    .filter((id): id is string => !!id);
  const fornecedores = await prisma.fornecedor.findMany({
    where: { id: { in: fornecedoresIds } },
    select: { id: true, razaoSocial: true, nomeFantasia: true },
  });
  const nomeFornecedorPorId = new Map(
    fornecedores.map((f) => [f.id, f.nomeFantasia ?? f.razaoSocial])
  );

  const anexo = montarAnexoMateriaisPorFornecedor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orcamento.itensMaterial as any,
    nomeFornecedorPorId
  );

  console.log(`Total de GRUPOS (fabricantes) após consolidar: ${anexo.grupos.length}\n`);
  for (const g of anexo.grupos) {
    console.log(`- ${g.fabricante}: ${g.itens.length} item(ns) consolidados, subtotal R$ ${Number(g.subtotal).toFixed(2)}`);
  }

  // Simula o empacotamento de páginas com o orçamento atual (25 linhas).
  const ORCAMENTO_LINHAS_POR_PAGINA = 25;
  const paginas: { grupos: string[] }[] = [];
  let paginaAtual: string[] = [];
  let linhasNaPagina = 0;
  for (const g of anexo.grupos) {
    const custo = g.itens.length + 2;
    if (paginaAtual.length > 0 && linhasNaPagina + custo > ORCAMENTO_LINHAS_POR_PAGINA) {
      paginas.push({ grupos: paginaAtual });
      paginaAtual = [];
      linhasNaPagina = 0;
    }
    paginaAtual.push(g.fabricante);
    linhasNaPagina += custo;
  }
  if (paginaAtual.length > 0) paginas.push({ grupos: paginaAtual });

  console.log(`\nSimulação com orçamento=${ORCAMENTO_LINHAS_POR_PAGINA}: ${paginas.length} página(s)`);
  paginas.forEach((p, i) => console.log(`  Página ${i + 1}: ${p.grupos.join(", ")}`));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
