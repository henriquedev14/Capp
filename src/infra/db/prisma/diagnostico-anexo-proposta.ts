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
    console.log(`- ${g.fabricante}: ${g.itens.length} item(ns), subtotal R$ ${g.subtotal.toFixed(2)}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
