/**
 * TESTES DA CORREÇÃO A2 (revisão 2) — status operacional da Remessa.
 *
 * ⚠️ Este é um SCRIPT DE VERIFICAÇÃO standalone, não um teste automatizado
 * integrado a um framework (o projeto não tem Jest/Vitest/Playwright — ver
 * achado da auditoria técnica). Ele:
 *   - Recusa rodar sem TEST_DATABASE_URL configurada explicitamente
 *     (nunca usa DATABASE_URL/produção como fallback silencioso);
 *   - Usa uma conexão Prisma própria, isolada do singleton `prisma` do app;
 *   - Ainda assim, TAMBÉM roda dentro de uma transação com rollback
 *     proposital, como segunda camada de segurança (não a única).
 *   - Sai com código de erro (`process.exitCode = 1`) se qualquer cenário falhar.
 *
 * CONFIGURAÇÃO NECESSÁRIA (documentada, ponto 8):
 *   1. Provisione um banco Postgres separado do de desenvolvimento/produção
 *      (ex: um segundo banco no mesmo Postgres: `createdb erp_engenharia_test`,
 *      ou um container Postgres dedicado só pra isso).
 *   2. Rode `npx prisma db push` UMA VEZ contra esse banco de teste pra
 *      criar o schema nele (isso NÃO é executado por este script).
 *   3. Popule pelo menos 1 usuário ativo nesse banco de teste (o script
 *      depende de `usuario.findFirstOrThrow({ where: { ativo: true } })`).
 *
 * COMANDO REPRODUZÍVEL:
 *   TEST_DATABASE_URL="postgresql://usuario:senha@host:5432/erp_engenharia_test" \
 *     npx tsx src/infra/db/prisma/teste-a2-status-operacional-remessa.ts
 *
 *   Ou, via o script adicionado ao package.json:
 *   TEST_DATABASE_URL="..." npm run test:expedicao-a2
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";
import * as repo from "@/infra/db/prisma/repositories/expedicao-prisma-repository";
import {
  calcularStatusOperacionalRemessa,
  statusEhProtegidoDeRecalculoOperacional,
  statusOperacionalEhRegressao,
} from "@/core/expedicao/use-cases/validacoes-expedicao";

// ---------------------------------------------------------------------------
// Guarda de segurança: recusa rodar sem banco de teste explícito
// ---------------------------------------------------------------------------

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  console.error(
    "\n❌ TEST_DATABASE_URL não configurada.\n" +
      "Este script se recusa a rodar contra DATABASE_URL (banco de dev/produção).\n" +
      "Configure TEST_DATABASE_URL apontando pra um banco de testes isolado antes de rodar.\n" +
      "Ver o cabeçalho deste arquivo para instruções completas.\n"
  );
  process.exit(1);
}

if (TEST_DATABASE_URL === process.env.DATABASE_URL) {
  console.error(
    "\n❌ TEST_DATABASE_URL é IGUAL a DATABASE_URL — isso apontaria pro banco de produção/dev.\n" +
      "Configure um banco de teste genuinamente separado.\n"
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: TEST_DATABASE_URL });
const adapter = new PrismaPg(pool);
const prismaTeste = new PrismaClient({ adapter });

class RollbackIntencional extends Error {}

const resultados: string[] = [];
let falhas = 0;

function assert(condicao: boolean, mensagem: string) {
  if (condicao) resultados.push(`  ✅ ${mensagem}`);
  else {
    resultados.push(`  ❌ ${mensagem}`);
    falhas++;
  }
}

async function assertLanca(fn: () => Promise<unknown>, mensagem: string) {
  try {
    await fn();
    resultados.push(`  ❌ ${mensagem} (esperava erro, não lançou)`);
    falhas++;
  } catch {
    resultados.push(`  ✅ ${mensagem}`);
  }
}

async function main() {
  try {
    await prismaTeste.$transaction(
      async (tx) => {
        const usuario = await tx.usuario.findFirstOrThrow({ where: { ativo: true } });

        const empresa = await tx.empresaGrupo.create({ data: { nome: `TESTE-A2-${Date.now()}`, ativo: true } });
        const cliente = await tx.cliente.create({
          data: {
            codigo: `TESTE-A2-C-${Date.now()}`,
            razaoSocial: "Cliente Teste A2",
            cnpj: `${Date.now()}`.slice(0, 14),
            ativo: true,
          },
        });
        const empreendimento = await tx.empreendimento.create({
          data: {
            codigo: `TESTE-A2-E-${Date.now()}`,
            nome: "Empreendimento Teste A2",
            clienteId: cliente.id,
            cidade: "Uberlândia",
            estado: "MG",
            endereco: "Rua Teste A2",
            tipo: "RESIDENCIAL_VERTICAL",
            construtora: "Construtora Teste",
            responsavelComercial: "Teste",
            status: "PRODUCAO",
          },
        });
        const tipologia = await tx.tipologia.create({
          data: { empreendimentoId: empreendimento.id, nome: "Tipo Teste A2", quantidadeUnidades: 100 },
        });

        async function novaRemessaComItens(itens: Array<{ descricao: string; quantidadePrevista: number }>) {
          return repo.criarRemessa(tx, {
            empresaId: empresa.id,
            clienteId: cliente.id,
            empreendimentoId: empreendimento.id,
            enderecoEntrega: "Endereço teste A2",
            criadoPorId: usuario.id,
            itens: itens.map((i) => ({
              tipologiaId: tipologia.id,
              tipologiaNome: tipologia.nome,
              tipoKit: "ELETRICO" as const,
              descricao: i.descricao,
              quantidadePrevista: i.quantidadePrevista,
            })),
          });
        }

        // ============================================================
        // Testes da função pura (sem banco) — ponto 4, 7
        // ============================================================
        console.log("\n=== Função pura: verificação por item, não por soma (ponto 4) ===");
        const statusMisto = calcularStatusOperacionalRemessa([
          { quantidadePrevista: 10, quantidadeSeparada: 10, quantidadeConferida: 10 }, // item A: 100%
          { quantidadePrevista: 10, quantidadeSeparada: 0, quantidadeConferida: 0 }, // item B: 0%
        ]);
        assert(
          statusMisto === "EM_SEPARACAO",
          `Item A 100% separado NÃO compensa item B com 0% — soma seria 10/20 (50%), mas resultado correto é EM_SEPARACAO, não AGUARDANDO_CONFERENCIA (atual: ${statusMisto})`
        );
        assert(
          calcularStatusOperacionalRemessa([
            { quantidadePrevista: 10, quantidadeSeparada: 10, quantidadeConferida: 10 },
          ]) === "EM_CONFERENCIA",
          "Item único 100% conferido NUNCA retorna LIBERADA_CARREGAMENTO automaticamente (ponto 1)"
        );

        console.log("\n=== Função pura: tipagem (ponto 7) ===");
        assert(
          statusEhProtegidoDeRecalculoOperacional("CANCELADA"),
          "statusEhProtegidoDeRecalculoOperacional aceita StatusRemessa tipado (CANCELADA)"
        );
        assert(
          statusOperacionalEhRegressao("EM_CONFERENCIA", "EM_SEPARACAO"),
          "statusOperacionalEhRegressao detecta EM_CONFERENCIA → EM_SEPARACAO como regressão"
        );
        assert(
          !statusOperacionalEhRegressao("EM_SEPARACAO", "EM_CONFERENCIA"),
          "statusOperacionalEhRegressao NÃO marca avanço (EM_SEPARACAO → EM_CONFERENCIA) como regressão"
        );

        // ============================================================
        // Ponto 5: remessa vazia
        // ============================================================
        console.log("\n=== Ponto 5: remessa sem itens é impedida ===");
        await assertLanca(
          () =>
            repo.criarRemessa(tx, {
              empresaId: empresa.id,
              clienteId: cliente.id,
              empreendimentoId: empreendimento.id,
              enderecoEntrega: "Teste vazio",
              criadoPorId: usuario.id,
              itens: [],
            }),
          "criarRemessa com itens=[] lança erro (backend impede, não só a UI)"
        );

        // ============================================================
        // Ponto 3: retorno atualizado de criarRemessa
        // ============================================================
        console.log("\n=== Ponto 3: criarRemessa retorna status já atualizado ===");
        const remessaNova = await novaRemessaComItens([{ descricao: "Item único", quantidadePrevista: 50 }]);
        assert(
          remessaNova.status === "AGUARDANDO_SEPARACAO",
          `Objeto retornado por criarRemessa já reflete AGUARDANDO_SEPARACAO, não RASCUNHO stale (atual: ${remessaNova.status})`
        );
        const remessaNovaNoBanco = await tx.remessa.findUniqueOrThrow({ where: { id: remessaNova.id } });
        assert(
          remessaNovaNoBanco.status === remessaNova.status,
          "Status retornado bate com o status realmente persistido no banco"
        );

        // ============================================================
        // Transições básicas 1→5 (mantidas da revisão anterior, agora
        // com EM_CONFERENCIA como teto — sem LIBERADA_CARREGAMENTO)
        // ============================================================
        console.log("\n=== Transições completas (capadas em EM_CONFERENCIA) ===");
        const item = remessaNova.itens[0]!;
        await repo.registrarQuantidadeSeparada(tx, item.id, 25, usuario.id);
        let r = await tx.remessa.findUniqueOrThrow({ where: { id: remessaNova.id } });
        assert(r.status === "EM_SEPARACAO", `Separação parcial → EM_SEPARACAO (atual: ${r.status})`);

        await repo.registrarQuantidadeSeparada(tx, item.id, 50, usuario.id);
        r = await tx.remessa.findUniqueOrThrow({ where: { id: remessaNova.id } });
        assert(r.status === "AGUARDANDO_CONFERENCIA", `Separação completa → AGUARDANDO_CONFERENCIA (atual: ${r.status})`);

        await repo.registrarQuantidadeConferida(tx, item.id, 30, usuario.id);
        r = await tx.remessa.findUniqueOrThrow({ where: { id: remessaNova.id } });
        assert(r.status === "EM_CONFERENCIA", `Conferência parcial → EM_CONFERENCIA (atual: ${r.status})`);

        await repo.registrarQuantidadeConferida(tx, item.id, 50, usuario.id);
        r = await tx.remessa.findUniqueOrThrow({ where: { id: remessaNova.id } });
        assert(
          r.status === "EM_CONFERENCIA",
          `[PONTO 1] Conferência 100% completa NÃO libera automaticamente — continua EM_CONFERENCIA (atual: ${r.status})`
        );

        // ============================================================
        // Ponto 1: liberação só via ação explícita
        // ============================================================
        console.log("\n=== Ponto 1: finalizarConferencia() é a única via pra LIBERADA_CARREGAMENTO ===");
        const remessaLiberada = await repo.finalizarConferencia(tx, remessaNova.id, usuario.id);
        assert(
          remessaLiberada.status === "LIBERADA_CARREGAMENTO",
          `finalizarConferencia() explícito muda pra LIBERADA_CARREGAMENTO (atual: ${remessaLiberada.status})`
        );

        await assertLanca(
          () => repo.finalizarConferencia(tx, remessaLiberada.id, usuario.id),
          "finalizarConferencia() chamado de novo (já LIBERADA_CARREGAMENTO) lança erro — não é EM_CONFERENCIA"
        );

        // ============================================================
        // Ponto 2: histórico registrado nas transições
        // ============================================================
        console.log("\n=== Ponto 2: histórico registrado a cada transição ===");
        const historicoRemessaNova = await tx.expedicaoHistorico.findMany({
          where: { remessaId: remessaNova.id },
          orderBy: { createdAt: "asc" },
        });
        assert(
          historicoRemessaNova.length >= 5,
          `Histórico tem ao menos 5 eventos (criação + 4 transições de status), encontrado: ${historicoRemessaNova.length}`
        );
        assert(
          historicoRemessaNova.every((h) => h.usuarioId === usuario.id),
          "Todos os eventos de histórico têm usuarioId preenchido"
        );
        assert(
          historicoRemessaNova.some((h) => h.statusAnterior === "AGUARDANDO_CONFERENCIA" && h.statusNovo === "EM_CONFERENCIA"),
          "Existe um evento de histórico com statusAnterior/statusNovo corretos (AGUARDANDO_CONFERENCIA → EM_CONFERENCIA)"
        );
        assert(
          historicoRemessaNova.some((h) => h.tipoEvento === "CONFERENCIA_FINALIZADA" && h.statusNovo === "LIBERADA_CARREGAMENTO"),
          "Existe evento CONFERENCIA_FINALIZADA registrado pela ação explícita"
        );

        // ============================================================
        // Ponto 8: atualização sem mudança de status não duplica histórico
        // ============================================================
        console.log("\n=== Ponto 8: sem mudança de status = sem histórico duplicado ===");
        const remessaSemMudanca = await novaRemessaComItens([{ descricao: "Item parado", quantidadePrevista: 10 }]);
        const historicoAntes = await tx.expedicaoHistorico.count({ where: { remessaId: remessaSemMudanca.id } });
        await repo.registrarQuantidadeSeparada(tx, remessaSemMudanca.itens[0]!.id, 0, usuario.id);
        const historicoDepois = await tx.expedicaoHistorico.count({ where: { remessaId: remessaSemMudanca.id } });
        assert(
          historicoAntes === historicoDepois,
          `Separar 0/0 de novo (sem mudança real de status) não cria histórico novo (antes: ${historicoAntes}, depois: ${historicoDepois})`
        );

        // ============================================================
        // Ponto 6: regressão bloqueada quando há movimentação operacional
        // ============================================================
        console.log("\n=== Ponto 6: regressão bloqueada com carregamento ativo ===");
        const remessaComCarregamento = await novaRemessaComItens([{ descricao: "Item com carregamento", quantidadePrevista: 40 }]);
        const itemCC = remessaComCarregamento.itens[0]!;
        await repo.registrarQuantidadeSeparada(tx, itemCC.id, 40, usuario.id);
        await repo.registrarQuantidadeConferida(tx, itemCC.id, 40, usuario.id);
        const volumeCC = await repo.criarVolume(tx, { remessaId: remessaComCarregamento.id, tipo: "CAIXA" });
        await repo.vincularItemAoVolume(tx, { volumeId: volumeCC.id, itemRemessaId: itemCC.id, quantidade: 40 });
        const carregamentoCC = await repo.criarCarregamento(tx, { remessaId: remessaComCarregamento.id, criadoPorId: usuario.id });
        await repo.vincularVolumeAoCarregamento(tx, {
          carregamentoId: carregamentoCC.id,
          volumeId: volumeCC.id,
          usuarioId: usuario.id,
        });

        const remessaAntesDeReduzir = await tx.remessa.findUniqueOrThrow({ where: { id: remessaComCarregamento.id } });
        assert(
          remessaAntesDeReduzir.status === "EM_CONFERENCIA",
          `Pré-condição: remessa em EM_CONFERENCIA antes de tentar regressão (atual: ${remessaAntesDeReduzir.status})`
        );

        await repo.registrarQuantidadeConferida(tx, itemCC.id, 10, usuario.id);
        const remessaAposTentarReduzir = await tx.remessa.findUniqueOrThrow({ where: { id: remessaComCarregamento.id } });
        assert(
          remessaAposTentarReduzir.status === "EM_CONFERENCIA",
          `Status NÃO regride mesmo reduzindo quantidadeConferida, pois já há volume+carregamento ativos (atual: ${remessaAposTentarReduzir.status})`
        );

        console.log("\nFinalizando transação com ROLLBACK proposital (nenhum dado persiste, mesmo no banco de teste)...");
        throw new RollbackIntencional("rollback proposital");
      },
      { isolationLevel: "Serializable", maxWait: 10000, timeout: 30000 }
    );
  } catch (e) {
    if (!(e instanceof RollbackIntencional)) {
      console.error("\n❌ ERRO INESPERADO DURANTE O TESTE:", e);
      falhas++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("RESULTADO DOS TESTES — CORREÇÃO A2 (revisão 2)");
  console.log("=".repeat(60));
  console.log(resultados.join("\n"));
  console.log("=".repeat(60));
  console.log(falhas === 0 ? `✅ TODOS OS TESTES PASSARAM (${resultados.length})` : `❌ ${falhas} TESTE(S) FALHARAM`);
  console.log(`Banco de teste usado: ${TEST_DATABASE_URL!.replace(/:[^:@]+@/, ":***@")}`);
  console.log("Nenhum dado foi persistido (rollback aplicado).");

  process.exitCode = falhas === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error("Erro fatal:", e);
    process.exitCode = 1;
  })
  .finally(() => prismaTeste.$disconnect());
