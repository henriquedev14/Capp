import { prisma } from "@/infra/db/prisma/client";

const PERCENTUAL_ENTRADA = 0.2; // 20% na assinatura
const DIAS_PRAZO_PAGAMENTO = 28; // 28 dias após assinatura OU após envio da remessa

/**
 * Cria o cronograma de recebimento automaticamente quando um Empreendimento
 * vira CONTRATADO — reflete como a HGI realmente recebe:
 *
 *  - 20% do valor total, devido 28 dias após a assinatura do contrato
 *    (cria já com data prevista definida)
 *  - Os 80% restantes divididos proporcionalmente entre os pavimentos do
 *    empreendimento — cada pavimento gera 1 parcela, mas ela só ganha
 *    data de vencimento quando alguém registra que aquele pavimento foi
 *    ENVIADO (data do envio + 28 dias). Até lá fica "aguardando envio".
 *
 * Isso ainda depende de alguém marcar manualmente o envio de cada
 * pavimento (não existe módulo de Produção ainda) — ver
 * registrarEnvioRemessa, em conta-receber-actions.ts.
 *
 * Idempotente: se já existir QUALQUER Conta a Receber pra esse
 * empreendimento, não cria de novo (evita duplicar se os dois gatilhos de
 * status acabarem chamando pro mesmo empreendimento).
 */
export async function criarContaReceberAutomatica(empreendimentoId: string): Promise<void> {
  const jaExiste = await prisma.contaReceber.findFirst({
    where: { empreendimentoId },
    select: { id: true },
  });
  if (jaExiste) return;

  const orcamento = await prisma.orcamento.findFirst({
    where: { empreendimentoId },
    orderBy: { revisao: "desc" },
    select: { id: true, totalServicosHgi: true, totalMateriais: true },
  });
  if (!orcamento) return; // sem orçamento, não tem o que lançar — silencioso de propósito

  // Só o valor de SERVIÇO (mão de obra) entra na projeção de recebimento —
  // materiais são repassados/rastreados à parte (Suprimentos), não fazem
  // parte do que a HGI cobra do cliente como parcela de remessa.
  const valorTotal = Number(orcamento.totalServicosHgi ?? 0);
  if (valorTotal <= 0) return;

  const valorEntrada = Math.round(valorTotal * PERCENTUAL_ENTRADA * 100) / 100;
  const valorRestante = valorTotal - valorEntrada;

  const dataEntrada = new Date();
  dataEntrada.setDate(dataEntrada.getDate() + DIAS_PRAZO_PAGAMENTO);

  await prisma.contaReceber.create({
    data: {
      empreendimentoId,
      orcamentoId: orcamento.id,
      tipo: "ENTRADA",
      valor: valorEntrada,
      dataPrevista: dataEntrada,
    },
  });

  // Busca TODOS os pavimentos do empreendimento — tanto os ligados direto
  // numa Torre quanto os ligados via Bloco dentro de uma Torre. Já traz
  // a data prevista de remessa que o Comercial cadastrou (se cadastrou)
  // — assim a Conta a Receber já nasce com a data, sem precisar que o
  // Financeiro preencha na mão depois.
  const torres = await prisma.torre.findMany({
    where: { empreendimentoId },
    include: {
      pavimentos: { select: { id: true, dataPrevistaRemessa: true }, orderBy: { ordem: "asc" } },
      blocos: {
        include: { pavimentos: { select: { id: true, dataPrevistaRemessa: true }, orderBy: { ordem: "asc" } } },
        orderBy: { ordem: "asc" },
      },
    },
    orderBy: { ordem: "asc" },
  });

  const pavimentos: { id: string; dataPrevistaRemessa: Date | null }[] = [];
  for (const torre of torres) {
    for (const p of torre.pavimentos) pavimentos.push(p);
    for (const bloco of torre.blocos) {
      for (const p of bloco.pavimentos) pavimentos.push(p);
    }
  }

  if (pavimentos.length === 0) {
    // Sem estrutura física cadastrada (torres/pavimentos) — não dá pra
    // saber em quantas remessas dividir. Cria os 80% restantes como uma
    // única remessa "genérica", sem pavimento vinculado, também
    // aguardando alguém registrar quando isso foi/será entregue.
    await prisma.contaReceber.create({
      data: {
        empreendimentoId,
        orcamentoId: orcamento.id,
        tipo: "REMESSA",
        valor: valorRestante,
      },
    });
    return;
  }

  const valorPorPavimento = Math.round((valorRestante / pavimentos.length) * 100) / 100;

  await prisma.contaReceber.createMany({
    data: pavimentos.map((p) => ({
      empreendimentoId,
      orcamentoId: orcamento.id,
      tipo: "REMESSA" as const,
      pavimentoId: p.id,
      valor: valorPorPavimento,
      // Já nasce com a data prevista, se o Comercial cadastrou uma —
      // continua null (aguardando preenchimento) se não cadastrou.
      dataPrevista: p.dataPrevistaRemessa,
    })),
  });
}
