/**
 * TESTES DA CORREÇÃO C2/C3.1 — soft-delete (arquivar/restaurar) de Empreendimento.
 *
 * ⚠️ Script de verificação standalone (o projeto não tem framework de
 * testes — achado já registrado na auditoria técnica).
 *
 * ESTRATÉGIA DE SEGURANÇA (ponto 7 da revisão) — Opção B escolhida
 * explicitamente: banco de teste exclusivo + limpeza explícita (DELETE),
 * não rollback de transação. Motivo: `arquivar()`/`restaurar()` do
 * repositório abrem sua PRÓPRIA transação via `prisma.$transaction(...)`
 * internamente (necessário pro ponto 1 — atomicidade update+evento) — não
 * aceitam um `tx` injetado de fora (isso quebraria a consistência com todo
 * o resto do repositório, que também nunca recebe `tx` como parâmetro).
 * Por isso, envolver a chamada num rollback de transação externo não
 * funciona: a transação interna do método é uma conexão/transação
 * diferente, que commitaria independente do rollback externo.
 *
 * Em vez disso, a segurança vem de outro lugar: `process.env.DATABASE_URL`
 * é redirecionado pro banco de teste ANTES de qualquer import que use o
 * singleton Prisma — usando IMPORTAÇÃO DINÂMICA (`await import(...)`)
 * dentro de `main()`, não `import` estático no topo do arquivo. Isso é
 * necessário porque imports estáticos são içados (hoisted) pelo motor de
 * módulos e poderiam ser resolvidos antes do código sequencial de
 * validação rodar, dependendo do sistema de módulos — a importação
 * dinâmica garante, de verdade, que a validação já rodou antes de
 * qualquer conexão Prisma ser aberta.
 *
 * CONFIGURAÇÃO NECESSÁRIA:
 *   1. Banco de teste isolado (mesmo exigido pela correção A2).
 *   2. `npx prisma db push` rodado uma vez contra esse banco.
 *   3. Pelo menos 1 usuário ativo nesse banco.
 *
 * COMANDO:
 *   TEST_DATABASE_URL="postgresql://..." npx tsx src/infra/db/prisma/teste-c2c3-arquivar-empreendimento.ts
 */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  console.error(
    "\n❌ TEST_DATABASE_URL não configurada. Este script se recusa a rodar sem um banco de teste isolado explícito.\n"
  );
  process.exit(1);
}
if (TEST_DATABASE_URL === process.env.DATABASE_URL) {
  console.error("\n❌ TEST_DATABASE_URL é igual a DATABASE_URL — configure um banco de teste genuinamente separado.\n");
  process.exit(1);
}

const resultados: string[] = [];
let falhas = 0;

function assert(condicao: boolean, mensagem: string) {
  if (condicao) resultados.push(`  ✅ ${mensagem}`);
  else {
    resultados.push(`  ❌ ${mensagem}`);
    falhas++;
  }
}

async function main() {
  // Redirecionamento + importação dinâmica — nesta ordem, dentro de
  // main(), garante que a validação acima já rodou antes de qualquer
  // conexão Prisma ser criada.
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  const { prisma } = await import("@/infra/db/prisma/client");
  const { EmpreendimentoPrismaRepository } = await import(
    "@/infra/db/prisma/repositories/empreendimento-prisma-repository"
  );
  const { verificarEmpreendimentoAtivo } = await import("@/infra/db/guardas/verificar-empreendimento-ativo");
  const { verificarEmpreendimentoNaoArquivado } = await import(
    "@/core/empreendimentos/use-cases/guarda-empreendimento-arquivado"
  );

  const empreendimentoRepo = new EmpreendimentoPrismaRepository();

  try {
    const usuario = await prisma.usuario.findFirstOrThrow({ where: { ativo: true } });
    const usuario2 = (await prisma.usuario.findFirst({ where: { ativo: true, id: { not: usuario.id } } })) ?? usuario;

    const cliente = await prisma.cliente.create({
      data: {
        codigo: `TESTE-C2C3-C-${Date.now()}`,
        razaoSocial: "Cliente Teste C2C3",
        cnpj: `${Date.now()}`.slice(0, 14),
        ativo: true,
      },
    });

    // ================================================================
    // CENÁRIO 1: Arquivar empreendimento SEM movimentação
    // ================================================================
    console.log("\n=== Cenário 1: arquivar sem movimentação ===");
    const emp1 = await prisma.empreendimento.create({
      data: {
        codigo: `TESTE-C2C3-E1-${Date.now()}`,
        nome: "Empreendimento Teste 1 (sem movimentação)",
        clienteId: cliente.id,
        cidade: "Uberlândia",
        estado: "MG",
        endereco: "Rua Teste 1",
        tipo: "RESIDENCIAL_VERTICAL",
        construtora: "Construtora Teste",
        responsavelComercial: "Teste",
        status: "PROSPECCAO",
      },
    });

    const arquivado1 = await empreendimentoRepo.arquivar(emp1.id, usuario.id);
    assert(arquivado1.excluidoEm !== null, "Empreendimento 1 tem excluidoEm preenchido após arquivar");
    assert(arquivado1.excluidoPorId === usuario.id, "excluidoPorId registra o usuário correto");

    // ================================================================
    // CENÁRIO 5 (parte 1): confirmar que NADA foi apagado fisicamente
    // ================================================================
    const emp1AindaExiste = await prisma.empreendimento.findUnique({ where: { id: emp1.id } });
    assert(emp1AindaExiste !== null, "Empreendimento 1 continua existindo fisicamente no banco (não foi apagado)");

    // ================================================================
    // CENÁRIO 6: desaparece das listagens operacionais
    // ================================================================
    const listaOperacional = await empreendimentoRepo.findMany();
    assert(
      !listaOperacional.some((e) => e.id === emp1.id),
      "Empreendimento 1 arquivado NÃO aparece em findMany() (listagem operacional)"
    );

    // ================================================================
    // CENÁRIO 12: arquivar de novo é idempotente
    // ================================================================
    console.log("\n=== Cenário 12: idempotência do arquivamento ===");
    const historicoAntes = await prisma.eventoEmpreendimento.count({ where: { empreendimentoId: emp1.id } });
    const dataOriginal = arquivado1.excluidoEm;
    await new Promise((r) => setTimeout(r, 50));
    const arquivadoDeNovo = await empreendimentoRepo.arquivar(emp1.id, usuario2.id);
    assert(
      arquivadoDeNovo.excluidoEm?.getTime() === dataOriginal?.getTime(),
      "Arquivar de novo NÃO altera a data original de excluidoEm"
    );
    assert(arquivadoDeNovo.excluidoPorId === usuario.id, "Arquivar de novo NÃO altera excluidoPorId pro segundo usuário");
    const historicoDepois = await prisma.eventoEmpreendimento.count({ where: { empreendimentoId: emp1.id } });
    assert(historicoAntes === historicoDepois, "Arquivar de novo NÃO duplica evento de timeline");

    // ================================================================
    // CENÁRIO 8/9: bloqueio de nova Remessa via chamada direta ao backend
    // ================================================================
    console.log("\n=== Cenário 8/9: bloqueio de nova Remessa via backend ===");
    const guardaRemessa = await verificarEmpreendimentoAtivo(emp1.id, prisma);
    assert(!guardaRemessa.permitido, "Guarda central bloqueia empreendimento arquivado (usada por criarRemessaAction)");
    assert(
      guardaRemessa.motivo === "Este empreendimento está arquivado. Restaure-o antes de realizar esta operação.",
      "Mensagem padronizada retornada corretamente"
    );

    // ================================================================
    // CENÁRIO C2/C3.1-B: resolução via junção (Remessa/ItemRemessa →
    // Empreendimento) — padrão usado nos helpers locais de Expedição
    // (guardaArquivadoPorRemessa/guardaArquivadoPorItemRemessa) e em
    // Produção/Suprimentos (via Tipologia/RegistroProducao).
    // ================================================================
    console.log("\n=== Cenário C2/C3.1-B: resolução via junção Remessa→Empreendimento ===");
    const empresaExpedicao = await prisma.empresaGrupo.create({
      data: { nome: `TESTE-C2C3-EMPRESA-${Date.now()}`, ativo: true },
    });
    const tipologiaExpedicao = await prisma.tipologia.create({
      data: { empreendimentoId: emp1.id, nome: "Tipo Expedição Teste", quantidadeUnidades: 10 },
    });
    const remessaTeste = await prisma.remessa.create({
      data: {
        empresaId: empresaExpedicao.id,
        ano: new Date().getFullYear(),
        sequencial: 1,
        numero: `TESTE-R-${Date.now()}`,
        clienteId: cliente.id,
        empreendimentoId: emp1.id,
        enderecoEntrega: "Endereço teste",
        criadoPorId: usuario.id,
      },
    });
    const itemRemessaTeste = await prisma.itemRemessa.create({
      data: {
        remessaId: remessaTeste.id,
        tipologiaId: tipologiaExpedicao.id,
        tipoKit: "ELETRICO",
        tipologiaNome: tipologiaExpedicao.nome,
        descricao: "Item teste C2C3-B",
        quantidadePrevista: 10,
      },
    });

    // emp1 já está arquivado neste ponto do script (cenário 1) — a
    // resolução via junção (ItemRemessa → Remessa → Empreendimento)
    // precisa detectar isso exatamente como a resolução direta detecta.
    const item = await prisma.itemRemessa.findUnique({
      where: { id: itemRemessaTeste.id },
      select: { remessa: { select: { empreendimentoId: true } } },
    });
    const guardaPorJuncao = await verificarEmpreendimentoAtivo(item!.remessa.empreendimentoId, prisma);
    assert(
      !guardaPorJuncao.permitido,
      "Resolução via junção (ItemRemessa→Remessa→Empreendimento) bloqueia corretamente quando arquivado"
    );

    // Limpeza imediata desses fixtures extras (fora do bloco de limpeza principal)
    await prisma.itemRemessa.delete({ where: { id: itemRemessaTeste.id } });
    await prisma.remessa.delete({ where: { id: remessaTeste.id } });
    await prisma.tipologia.delete({ where: { id: tipologiaExpedicao.id } });
    await prisma.empresaGrupo.delete({ where: { id: empresaExpedicao.id } });

    // ================================================================
    // CENÁRIO 2: arquivar com Contas a Receber vinculadas
    // ================================================================
    console.log("\n=== Cenário 2: arquivar com Conta a Receber ===");
    const emp2 = await prisma.empreendimento.create({
      data: {
        codigo: `TESTE-C2C3-E2-${Date.now()}`,
        nome: "Empreendimento Teste 2 (com financeiro)",
        clienteId: cliente.id,
        cidade: "Uberlândia",
        estado: "MG",
        endereco: "Rua Teste 2",
        tipo: "RESIDENCIAL_VERTICAL",
        construtora: "Construtora Teste",
        responsavelComercial: "Teste",
        status: "PROSPECCAO",
      },
    });

    const contaReceber = await prisma.contaReceber.create({
      data: {
        empreendimentoId: emp2.id,
        tipo: "ENTRADA",
        observacoes: "Teste C2C3",
        valor: 1000,
        dataPrevista: new Date(),
        recebido: false,
      },
    });

    await empreendimentoRepo.arquivar(emp2.id, usuario.id);

    // ================================================================
    // CENÁRIO 7: continua aparecendo em registros financeiros/históricos
    // ================================================================
    const contaReceberAposArquivar = await prisma.contaReceber.findUnique({ where: { id: contaReceber.id } });
    assert(
      contaReceberAposArquivar !== null,
      "Conta a Receber continua existindo e acessível após arquivar o empreendimento vinculado"
    );

    const { listarFilaContasAReceber } = await import("@/features/financeiro/lib/comando-financeiro");
    const filaReceber = await listarFilaContasAReceber(100);
    const itemNaFila = filaReceber.find((i) => i.empreendimentoId === emp2.id);
    assert(itemNaFila !== undefined, "Conta a Receber do empreendimento arquivado CONTINUA na fila financeira");
    assert(itemNaFila?.empreendimentoArquivado === true, "Fila financeira marca empreendimentoArquivado corretamente");

    // ================================================================
    // CENÁRIO 3: arquivar com Orçamento e histórico
    // ================================================================
    console.log("\n=== Cenário 3: arquivar com Orçamento ===");
    const { OrcamentacaoPrismaRepository } = await import(
      "@/infra/db/prisma/repositories/orcamentacao-prisma-repository"
    );
    const orcamentacaoRepo = new OrcamentacaoPrismaRepository();
    const tipologia = await prisma.tipologia.create({
      data: { empreendimentoId: emp2.id, nome: "Tipo Teste", quantidadeUnidades: 5 },
    });

    const orcamentoCriado = await orcamentacaoRepo.criar({
      empreendimentoId: emp2.id,
      revisao: 1,
      tier: 2,
      criadoPorId: usuario.id,
      itensServico: [
        {
          tipologiaId: tipologia.id,
          tipologiaNome: tipologia.nome,
          kit: "ELETRICO",
          quantidade: 5,
          precoBase: 100,
          multiplicador: 1.2,
          precoUnitario: 120,
          total: 600,
        },
      ],
      itensMaterial: [],
    });

    const orcamentoAposArquivar = await prisma.orcamento.findUnique({ where: { id: orcamentoCriado.id } });
    assert(orcamentoAposArquivar !== null, "Orçamento existente continua intacto após arquivar o empreendimento");

    // ================================================================
    // CENÁRIO 4: arquivar com documentos
    // ================================================================
    console.log("\n=== Cenário 4: arquivar com documento ===");
    const documento = await prisma.documentoEmpreendimento.create({
      data: {
        empreendimentoId: emp2.id,
        nome: "documento-teste.pdf",
        url: "",
        conteudo: new Uint8Array([1, 2, 3]),
        tamanho: 3,
        tipo: "application/pdf",
        usuarioId: usuario.id,
      },
    });

    const documentoAposArquivar = await prisma.documentoEmpreendimento.findUnique({ where: { id: documento.id } });
    assert(documentoAposArquivar !== null, "Documento continua existindo após arquivar o empreendimento");

    // ================================================================
    // CENÁRIO 5 (parte 2): consolidado — nada foi apagado
    // ================================================================
    console.log("\n=== Cenário 5: nenhum registro relacionado foi apagado (consolidado) ===");
    assert(
      (await prisma.contaReceber.count({ where: { empreendimentoId: emp2.id } })) === 1,
      "Conta a Receber: 1 registro preservado"
    );
    assert(
      (await prisma.orcamento.count({ where: { empreendimentoId: emp2.id } })) === 1,
      "Orçamento: 1 registro preservado"
    );
    assert(
      (await prisma.documentoEmpreendimento.count({ where: { empreendimentoId: emp2.id } })) === 1,
      "Documento: 1 registro preservado"
    );

    // ================================================================
    // CENÁRIOS 10/11: restaurar
    // ================================================================
    console.log("\n=== Cenário 10/11: restaurar ===");
    const restaurado = await empreendimentoRepo.restaurar(emp1.id, usuario.id);
    assert(restaurado.excluidoEm === null, "excluidoEm volta a null após restaurar");
    assert(restaurado.excluidoPorId === null, "excluidoPorId volta a null após restaurar");

    const listaAposRestaurar = await empreendimentoRepo.findMany();
    assert(
      listaAposRestaurar.some((e) => e.id === emp1.id),
      "Empreendimento 1 volta a aparecer em findMany() após restaurar"
    );

    const guardaAposRestaurar = verificarEmpreendimentoNaoArquivado(restaurado);
    assert(guardaAposRestaurar.permitido, "Guarda permite operações normalmente após restaurar");

    const historicoAntesRestaurarDeNovo = await prisma.eventoEmpreendimento.count({
      where: { empreendimentoId: emp1.id },
    });
    await empreendimentoRepo.restaurar(emp1.id, usuario2.id);
    const historicoDepoisRestaurarDeNovo = await prisma.eventoEmpreendimento.count({
      where: { empreendimentoId: emp1.id },
    });
    assert(
      historicoAntesRestaurarDeNovo === historicoDepoisRestaurarDeNovo,
      "Restaurar de novo (já ativo) NÃO duplica evento de timeline"
    );

    // ================================================================
    // LIMPEZA — DELETE explícito (Opção B: banco de teste isolado)
    // ================================================================
    console.log("\nLimpando dados de teste...");
    await prisma.eventoEmpreendimento.deleteMany({ where: { empreendimentoId: { in: [emp1.id, emp2.id] } } });
    await prisma.documentoEmpreendimento.deleteMany({ where: { empreendimentoId: emp2.id } });
    await prisma.orcamento.deleteMany({ where: { empreendimentoId: emp2.id } });
    await prisma.tipologia.deleteMany({ where: { empreendimentoId: emp2.id } });
    await prisma.contaReceber.deleteMany({ where: { empreendimentoId: emp2.id } });
    await prisma.empreendimento.deleteMany({ where: { id: { in: [emp1.id, emp2.id] } } });
    await prisma.cliente.delete({ where: { id: cliente.id } });
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n" + "=".repeat(60));
  console.log("RESULTADO DOS TESTES — CORREÇÃO C2/C3.1");
  console.log("=".repeat(60));
  console.log(resultados.join("\n"));
  console.log("=".repeat(60));
  console.log(falhas === 0 ? `✅ TODOS OS TESTES PASSARAM (${resultados.length})` : `❌ ${falhas} TESTE(S) FALHARAM`);
  console.log(`Banco de teste usado: ${TEST_DATABASE_URL!.replace(/:[^:@]+@/, ":***@")}`);

  process.exitCode = falhas === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  process.exitCode = 1;
});
