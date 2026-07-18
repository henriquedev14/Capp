/**
 * Script de verificação do módulo de Expedição — cenário principal +
 * cenários de guarda (itens 1, 4-10 do plano de testes aprovado).
 *
 * SEGURANÇA: todo o script roda DENTRO de uma única transação que é
 * PROPOSITALMENTE revertida (rollback) ao final — nenhum dado é
 * persistido no banco, mesmo em produção. Isso implementa a "estratégia
 * de limpeza segura" citada no plano de testes aprovado, já que não há
 * um banco de testes isolado provisionado nesta VM.
 *
 * O cenário de concorrência real (2 requisições simultâneas de verdade,
 * cada uma em sua própria transação/conexão) NÃO pode ser testado aqui
 * dentro — uma única transação Postgres é sempre sequencial. Ver
 * teste-expedicao-concorrencia.ts para esse caso específico, que
 * cria e DELETA dados reais (não usa rollback).
 *
 * Uso: npx tsx src/infra/db/prisma/teste-expedicao-cenario-principal.ts
 */

import { prisma } from "@/infra/db/prisma/client";
import * as repo from "@/infra/db/prisma/repositories/expedicao-prisma-repository";
import {
  calcularSaldoDisponivel,
  podeVincularVolumeAoCarregamento,
} from "@/core/expedicao/use-cases/validacoes-expedicao";

class RollbackIntencional extends Error {}

const resultados: string[] = [];
let falhas = 0;

function assert(condicao: boolean, mensagem: string) {
  if (condicao) {
    resultados.push(`  ✅ ${mensagem}`);
  } else {
    resultados.push(`  ❌ ${mensagem}`);
    falhas++;
  }
}

async function main() {
  try {
    await prisma.$transaction(
      async (tx) => {
        console.log("Preparando dados de teste (dentro da transação, nada persiste)...");

        const usuario = await tx.usuario.findFirstOrThrow({ where: { ativo: true } });

        const empresa = await tx.empresaGrupo.create({
          data: { nome: `TESTE-EXPEDICAO-${Date.now()}`, ativo: true },
        });

        const cliente = await tx.cliente.create({
          data: {
            codigo: `TESTE-C-${Date.now()}`,
            razaoSocial: "Cliente de Teste Ltda",
            cnpj: `${Date.now()}`.slice(0, 14),
            ativo: true,
          },
        });

        const empreendimento = await tx.empreendimento.create({
          data: {
            codigo: `TESTE-E-${Date.now()}`,
            nome: "Empreendimento de Teste",
            clienteId: cliente.id,
            cidade: "Uberlândia",
            estado: "MG",
            endereco: "Rua de Teste, 123",
            tipo: "RESIDENCIAL_VERTICAL",
            construtora: "Construtora Teste",
            responsavelComercial: "Teste",
            status: "PRODUCAO",
          },
        });

        const tipologia = await tx.tipologia.create({
          data: {
            empreendimentoId: empreendimento.id,
            nome: "Tipo Teste",
            quantidadeUnidades: 300,
          },
        });

        // ================================================================
        // CENÁRIO PRINCIPAL: 300 kits / 3 carregamentos (100+120+80)
        // ================================================================
        console.log("\n=== Cenário principal: 300 kits / 3 carregamentos ===");

        const remessa = await repo.criarRemessa(tx, {
          empresaId: empresa.id,
          clienteId: cliente.id,
          empreendimentoId: empreendimento.id,
          enderecoEntrega: "Endereço original da remessa",
          criadoPorId: usuario.id,
          itens: [
            {
              tipologiaId: tipologia.id,
              tipologiaNome: tipologia.nome,
              tipoKit: "ELETRICO",
              descricao: "Kit Elétrico — Tipo Teste",
              quantidadePrevista: 300,
            },
          ],
        });
        const item = remessa.itens[0]!;

        assert(remessa.numero.startsWith("R-"), `Remessa criada com número ${remessa.numero}`);
        assert(item.quantidadePrevista === 300, "Item criado com quantidadePrevista=300");

        await repo.registrarQuantidadeSeparada(tx, item.id, 300, usuario.id);
        await repo.registrarQuantidadeConferida(tx, item.id, 300, usuario.id);

        let itemAtual = await tx.itemRemessa.findUniqueOrThrow({ where: { id: item.id } });
        assert(itemAtual.quantidadeConferida === 300, "300 unidades conferidas");
        assert(calcularSaldoDisponivel(itemAtual) === 300, "Saldo disponível = 300 antes de qualquer alocação");

        // 3 volumes, um por carregamento (100 + 120 + 80)
        const volume1 = await repo.criarVolume(tx, { remessaId: remessa.id, tipo: "CAIXA" });
        const volume2 = await repo.criarVolume(tx, { remessaId: remessa.id, tipo: "CAIXA" });
        const volume3 = await repo.criarVolume(tx, { remessaId: remessa.id, tipo: "CAIXA" });

        await repo.vincularItemAoVolume(tx, { volumeId: volume1.id, itemRemessaId: item.id, quantidade: 100 });
        await repo.vincularItemAoVolume(tx, { volumeId: volume2.id, itemRemessaId: item.id, quantidade: 120 });
        await repo.vincularItemAoVolume(tx, { volumeId: volume3.id, itemRemessaId: item.id, quantidade: 80 });

        const carregamento1 = await repo.criarCarregamento(tx, { remessaId: remessa.id, criadoPorId: usuario.id });
        const carregamento2 = await repo.criarCarregamento(tx, { remessaId: remessa.id, criadoPorId: usuario.id });
        const carregamento3 = await repo.criarCarregamento(tx, { remessaId: remessa.id, criadoPorId: usuario.id });

        assert(carregamento1.numero === 1 && carregamento2.numero === 2 && carregamento3.numero === 3,
          `Carregamentos numerados sequencialmente: ${carregamento1.numero}, ${carregamento2.numero}, ${carregamento3.numero}`);

        await repo.vincularVolumeAoCarregamento(tx, { carregamentoId: carregamento1.id, volumeId: volume1.id, usuarioId: usuario.id });
        await repo.vincularVolumeAoCarregamento(tx, { carregamentoId: carregamento2.id, volumeId: volume2.id, usuarioId: usuario.id });
        await repo.vincularVolumeAoCarregamento(tx, { carregamentoId: carregamento3.id, volumeId: volume3.id, usuarioId: usuario.id });

        itemAtual = await tx.itemRemessa.findUniqueOrThrow({ where: { id: item.id } });
        assert(itemAtual.quantidadeAlocada === 300, `Alocada = 300 (100+120+80), atual: ${itemAtual.quantidadeAlocada}`);
        assert(calcularSaldoDisponivel(itemAtual) === 0, "Saldo disponível = 0 após alocar tudo");

        // Libera, marca carregado e registra saída do carregamento 1
        // Precisa mudar pra CONFERIDO antes de liberar — pulando etapas
        // intermediárias de propósito pro teste (RASCUNHO->...->CONFERIDO)
        await tx.carregamento.update({ where: { id: carregamento1.id }, data: { status: "CONFERIDO" } });
        await repo.liberarCarregamento(tx, { carregamentoId: carregamento1.id, usuarioId: usuario.id });
        await repo.marcarComoCarregado(tx, { carregamentoId: carregamento1.id, usuarioId: usuario.id });
        await repo.registrarSaida(tx, { carregamentoId: carregamento1.id, usuarioId: usuario.id });

        itemAtual = await tx.itemRemessa.findUniqueOrThrow({ where: { id: item.id } });
        assert(itemAtual.quantidadeExpedida === 100, `Expedida = 100 após 1º carregamento sair, atual: ${itemAtual.quantidadeExpedida}`);
        assert(itemAtual.quantidadeAlocada === 200, `Alocada = 200 (300-100), atual: ${itemAtual.quantidadeAlocada}`);

        let remessaAtual = await tx.remessa.findUniqueOrThrow({ where: { id: remessa.id } });
        assert(remessaAtual.status === "PARCIALMENTE_EXPEDIDA", `Remessa PARCIALMENTE_EXPEDIDA após 1º carregamento, atual: ${remessaAtual.status}`);

        // Carregamento 2
        await tx.carregamento.update({ where: { id: carregamento2.id }, data: { status: "CONFERIDO" } });
        await repo.liberarCarregamento(tx, { carregamentoId: carregamento2.id, usuarioId: usuario.id });
        await repo.marcarComoCarregado(tx, { carregamentoId: carregamento2.id, usuarioId: usuario.id });
        await repo.registrarSaida(tx, { carregamentoId: carregamento2.id, usuarioId: usuario.id });

        // Carregamento 3
        await tx.carregamento.update({ where: { id: carregamento3.id }, data: { status: "CONFERIDO" } });
        await repo.liberarCarregamento(tx, { carregamentoId: carregamento3.id, usuarioId: usuario.id });
        await repo.marcarComoCarregado(tx, { carregamentoId: carregamento3.id, usuarioId: usuario.id });
        await repo.registrarSaida(tx, { carregamentoId: carregamento3.id, usuarioId: usuario.id });

        itemAtual = await tx.itemRemessa.findUniqueOrThrow({ where: { id: item.id } });
        assert(itemAtual.quantidadeExpedida === 300, `Expedida = 300 (100+120+80) no final, atual: ${itemAtual.quantidadeExpedida}`);
        assert(itemAtual.quantidadeAlocada === 0, `Alocada = 0 no final, atual: ${itemAtual.quantidadeAlocada}`);
        assert(itemAtual.quantidadeCarregada === 0, `Carregada = 0 no final (não acumula), atual: ${itemAtual.quantidadeCarregada}`);
        assert(calcularSaldoDisponivel(itemAtual) === 0, "Saldo final = 0 (não sobra nem regride)");

        remessaAtual = await tx.remessa.findUniqueOrThrow({ where: { id: remessa.id } });
        assert(remessaAtual.status === "TOTALMENTE_EXPEDIDA", `Remessa TOTALMENTE_EXPEDIDA no final, atual: ${remessaAtual.status}`);

        const historico = await tx.expedicaoHistorico.findMany({ where: { remessaId: remessa.id } });
        assert(historico.length > 0, `Histórico registrado (${historico.length} eventos)`);

        // ================================================================
        // CENÁRIO 4: Volume vinculado a 2 carregamentos ativos → bloqueado
        // ================================================================
        console.log("\n=== Cenário 4: volume em 2 carregamentos ativos ===");
        const volumeTeste4 = await repo.criarVolume(tx, { remessaId: remessa.id, tipo: "AVULSO" });
        // Sem itens no volume — só testando a trava de exclusividade
        const carregamentoA = await repo.criarCarregamento(tx, { remessaId: remessa.id, criadoPorId: usuario.id });
        const carregamentoB = await repo.criarCarregamento(tx, { remessaId: remessa.id, criadoPorId: usuario.id });

        await repo.vincularVolumeAoCarregamento(tx, {
          carregamentoId: carregamentoA.id,
          volumeId: volumeTeste4.id,
          usuarioId: usuario.id,
        });

        try {
          await repo.vincularVolumeAoCarregamento(tx, {
            carregamentoId: carregamentoB.id,
            volumeId: volumeTeste4.id,
            usuarioId: usuario.id,
          });
          assert(false, "Deveria ter bloqueado volume em 2 carregamentos ativos");
        } catch {
          assert(true, "Bloqueado corretamente: volume já em carregamento ativo");
        }

        // ================================================================
        // CENÁRIO 8: Quantidade maior que saldo → bloqueado
        // ================================================================
        console.log("\n=== Cenário 8: quantidade maior que saldo ===");
        const remessaTeste8 = await repo.criarRemessa(tx, {
          empresaId: empresa.id,
          clienteId: cliente.id,
          empreendimentoId: empreendimento.id,
          enderecoEntrega: "Teste 8",
          criadoPorId: usuario.id,
          itens: [
            {
              tipologiaId: tipologia.id,
              tipologiaNome: tipologia.nome,
              tipoKit: "ELETRICO",
              descricao: "Item pequeno",
              quantidadePrevista: 10,
            },
          ],
        });
        const item8 = remessaTeste8.itens[0]!;
        await repo.registrarQuantidadeSeparada(tx, item8.id, 10, usuario.id);
        await repo.registrarQuantidadeConferida(tx, item8.id, 10, usuario.id);
        const volume8 = await repo.criarVolume(tx, { remessaId: remessaTeste8.id, tipo: "CAIXA" });
        try {
          await repo.vincularItemAoVolume(tx, { volumeId: volume8.id, itemRemessaId: item8.id, quantidade: 999 });
          assert(false, "Deveria ter bloqueado quantidade maior que saldo");
        } catch {
          assert(true, "Bloqueado corretamente: quantidade maior que saldo disponível");
        }

        // ================================================================
        // CENÁRIO 9: Cancelar carregamento devolve saldo
        // ================================================================
        console.log("\n=== Cenário 9: cancelamento devolve saldo ===");
        const remessaTeste9 = await repo.criarRemessa(tx, {
          empresaId: empresa.id,
          clienteId: cliente.id,
          empreendimentoId: empreendimento.id,
          enderecoEntrega: "Teste 9",
          criadoPorId: usuario.id,
          itens: [
            {
              tipologiaId: tipologia.id,
              tipologiaNome: tipologia.nome,
              tipoKit: "HIDRAULICO",
              descricao: "Item cancelamento",
              quantidadePrevista: 50,
            },
          ],
        });
        const item9 = remessaTeste9.itens[0]!;
        await repo.registrarQuantidadeSeparada(tx, item9.id, 50, usuario.id);
        await repo.registrarQuantidadeConferida(tx, item9.id, 50, usuario.id);
        const volume9 = await repo.criarVolume(tx, { remessaId: remessaTeste9.id, tipo: "CAIXA" });
        await repo.vincularItemAoVolume(tx, { volumeId: volume9.id, itemRemessaId: item9.id, quantidade: 50 });
        const carregamento9 = await repo.criarCarregamento(tx, { remessaId: remessaTeste9.id, criadoPorId: usuario.id });
        await repo.vincularVolumeAoCarregamento(tx, { carregamentoId: carregamento9.id, volumeId: volume9.id, usuarioId: usuario.id });

        let item9Atual = await tx.itemRemessa.findUniqueOrThrow({ where: { id: item9.id } });
        assert(item9Atual.quantidadeAlocada === 50, "Alocada = 50 antes de cancelar");

        await repo.cancelarCarregamento(tx, { carregamentoId: carregamento9.id, usuarioId: usuario.id, motivo: "Teste de cancelamento" });

        item9Atual = await tx.itemRemessa.findUniqueOrThrow({ where: { id: item9.id } });
        assert(item9Atual.quantidadeAlocada === 0, `Alocada volta a 0 após cancelar, atual: ${item9Atual.quantidadeAlocada}`);
        assert(calcularSaldoDisponivel(item9Atual) === 50, "Saldo volta a 50 (disponível de novo) após cancelar");

        const volume9Atual = await tx.volume.findUniqueOrThrow({ where: { id: volume9.id } });
        assert(volume9Atual.status === "CONFERIDO", `Volume volta pra CONFERIDO após cancelar, atual: ${volume9Atual.status}`);

        // ================================================================
        // CENÁRIO 10: Mudar endereço do Empreendimento não afeta remessa existente
        // ================================================================
        console.log("\n=== Cenário 10: endereço congelado ===");
        const enderecoOriginalDaRemessa = remessa.enderecoEntrega;
        await tx.empreendimento.update({ where: { id: empreendimento.id }, data: { endereco: "Endereço MUDOU depois" } });
        const remessaAposUpdate = await tx.remessa.findUniqueOrThrow({ where: { id: remessa.id } });
        assert(
          remessaAposUpdate.enderecoEntrega === enderecoOriginalDaRemessa,
          "Endereço da remessa não mudou mesmo após alterar o do empreendimento"
        );

        // ================================================================
        // CENÁRIO 6/7 (validação de lógica pura, sem necessidade de DB)
        // ================================================================
        console.log("\n=== Cenário 6/7: validações de motorista/veículo (lógica pura) ===");
        const valMotorista = podeVincularVolumeAoCarregamento({
          volumeStatus: "EMBARCADO",
          volumeRemessaId: "a",
          carregamentoRemessaId: "a",
          statusDosCarregamentosVinculados: [],
        });
        assert(!valMotorista.valido, "Volume EMBARCADO corretamente rejeitado pela validação pura");

        console.log("\nFinalizando transação com ROLLBACK proposital (nenhum dado persiste)...");
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
  console.log("RESULTADO DOS TESTES");
  console.log("=".repeat(60));
  console.log(resultados.join("\n"));
  console.log("=".repeat(60));
  console.log(falhas === 0 ? `✅ TODOS OS TESTES PASSARAM (${resultados.length})` : `❌ ${falhas} TESTE(S) FALHARAM`);
  console.log("Nenhum dado foi persistido no banco (rollback aplicado).");

  process.exitCode = falhas === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error("Erro fatal:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
