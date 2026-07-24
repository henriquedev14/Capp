# Padrão de Service Layer — ConstruApp

**Tarefa 2.1.1 do Plano Mestre.** Este documento formaliza uma convenção que já vinha emergindo organicamente no código — não é uma invenção do zero. Objetivo: dar um nome e regras claras pra algo que várias partes do projeto já faziam bem (`calcular-itens-servico.ts`, `jornada-orcamento.ts`, `validacoes-expedicao.ts`, `guarda-empreendimento-arquivado.ts`), pra parar de reinventar isso caso a caso e aplicar com consistência daqui pra frente.

## Nomenclatura

O Plano Mestre chama isso de "Service" (GateService, OrcamentoService, PropostaService). O código já usa o nome **use-case** pra essa mesma ideia. Decisão: **manter "use-case"** como nome de pasta/arquivo — é o que já está em uso, renomear geraria churn sem benefício real. Quando o Plano Mestre falar em "Service", leia-se "use-case" — são a mesma coisa.

## A regra central: lógica de negócio pura, sem I/O

Um use-case é uma função (ou conjunto de funções) que:

1. **Não importa `prisma` diretamente.** Recebe os dados de que precisa como parâmetros já carregados (objetos simples, não IDs pra buscar sozinho).
2. **Não sabe que está rodando dentro do Next.js.** Não importa `revalidatePath`, não sabe o que é uma Server Action, não lança erro pro usuário formatado em HTML.
3. **É testável isoladamente**, sem precisar de banco de dados, sem precisar de mock de Prisma — só passar objetos JavaScript simples e checar o retorno. (Testes de caracterização da Fase 1.3 são a prova disso: `calcular-itens-servico.test.ts` não toca em banco nenhum.)
4. **Vive em `src/core/<domínio>/use-cases/<nome>.ts`.**

Quando a lógica PRECISA de uma consulta ao banco pra decidir algo (ex: "esse empreendimento está arquivado?"), o padrão é separar em duas camadas:
- A regra pura fica no use-case (`verificarEmpreendimentoNaoArquivado`, que recebe o objeto empreendimento já carregado).
- Um wrapper fino em `src/infra/db/guardas/` (ou similar) faz o `prisma.findUnique` e chama o use-case puro com o resultado (`verificarEmpreendimentoAtivo`, que busca no banco e delega a decisão).

Essa separação é o que permite testar a REGRA sem precisar de banco, mesmo quando a regra na prática sempre depende de um dado que vem do banco.

## Formato de retorno

Duas famílias de formato, conforme o caso:

**Validação/guarda** (pergunta sim/não com motivo):
```typescript
interface ResultadoValidacao {
  permitido: boolean; // ou "valido", conforme o contexto
  motivo?: string;
}
```

**Operação com resultado** (calcula algo, pode falhar):
```typescript
type Resultado<T> = T | { erro: string };
// ou, quando não há retorno de dado, só sucesso/falha:
type Resultado = { ok: true } | { erro: string };
```

Nunca `throw` de dentro de um use-case pra sinalizar uma regra de negócio violada (ex: "orçamento não pode ser editado nesse status") — isso é fluxo esperado, não uma exceção. `throw`/exceção fica reservado pra erro de programação de verdade (ex: `exigirPermissao` lança quando falta permissão, porque isso é tratado uma camada acima, na Server Action, com um catch genérico).

## O que fica na Server Action (não no use-case)

A Server Action (`src/features/<domínio>/actions/*.ts`) é a "cola" com o Next.js — é dela a responsabilidade de:
1. Checar permissão (`exigirPermissao`).
2. Buscar os dados no banco (`prisma.algo.findUnique(...)`).
3. Chamar o use-case puro, passando os dados já carregados.
4. Se o use-case aprovar, fazer a escrita no banco (`prisma.algo.update(...)`).
5. Registrar log de segurança quando aplicável.
6. Chamar `revalidatePath`.
7. Formatar o erro final pro formato que a tela espera.

## Exemplo completo (padrão de referência)

```typescript
// src/core/pedidos/use-cases/verificar-pedido-cancelavel.ts
// — Puro, sem I/O, testável sem banco —
export function verificarPedidoCancelavel(pedido: { status: string }): { permitido: boolean; motivo?: string } {
  if (pedido.status === "RECEBIDO") {
    return { permitido: false, motivo: "Pedido já recebido não pode ser cancelado." };
  }
  return { permitido: true };
}

// src/features/pedidos/actions/pedido-actions.ts
// — Cola com Next.js, faz I/O —
export async function cancelarPedido(pedidoId: string) {
  await exigirPermissao(PERMISSOES.PEDIDO_CANCELAR);
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) return { erro: "Pedido não encontrado." };

  const validacao = verificarPedidoCancelavel(pedido);
  if (!validacao.permitido) return { erro: validacao.motivo };

  await prisma.pedido.update({ where: { id: pedidoId }, data: { status: "CANCELADO" } });
  revalidatePath("/pedidos");
  return { ok: true };
}
```

## Quando NÃO vale a pena extrair um use-case

Nem toda lógica precisa virar use-case separado. Fica direto na Server Action quando:
- É uma única checagem trivial de 1-2 linhas, sem regra de negócio real por trás (ex: `if (!nome) return { erro: "Nome obrigatório" }`).
- Não existe (ainda) um segundo lugar no código que precisa da mesma regra.

O sinal de que VALE a pena extrair: a mesma lógica está (ou vai ficar) duplicada em 2+ arquivos, ou a regra é complexa o suficiente pra merecer teste próprio.

## O que vem a seguir (Tarefas 2.1.2 a 2.1.4)

Com essa convenção formalizada, as próximas tarefas do Épico 2 consistem em auditar as actions existentes e extrair pra use-cases a lógica que hoje está misturada direto no arquivo de action:

- **2.1.2 — GateService**: `gates-status.ts` já é 90% disso — falta conferir se toda regra de gate do sistema (não só orçamentação/negociação) está ali, e não duplicada em outro lugar.
- **2.1.3 — OrcamentoService**: consolidar cálculos e regras de orçamento espalhados (`calcular-itens-servico.ts` já é um pedaço bom; falta ver o que mais existe solto em `orcamento-actions.ts`).
- **2.1.4 — PropostaService**: mesma ideia pra geração de proposta (`renderizar-proposta.tsx` hoje mistura busca de dados, validação e renderização no mesmo lugar).
