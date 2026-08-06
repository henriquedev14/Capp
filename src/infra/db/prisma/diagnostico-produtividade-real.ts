import { buscarProdutividadePorPessoa } from "@/features/produtividade/actions/produtividade-actions";

async function main() {
  const fim = new Date();
  const inicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  console.log("Chamando buscarProdutividadePorPessoa...");
  const resultado = await buscarProdutividadePorPessoa(inicio, fim);
  console.log(`\nRetornou ${resultado.length} pessoa(s):\n`);
  console.log(JSON.stringify(resultado, null, 2));
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
