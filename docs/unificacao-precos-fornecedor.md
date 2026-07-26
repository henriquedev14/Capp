# Unificação de Preços de Fornecedor — Desenho Técnico

**Tarefa 2.3.1 do Plano Mestre.** Este documento decide COMO resolver o achado da auditoria original ("3 sistemas paralelos de preço") — depois de examinar o uso real no código (não só o schema do banco), a conclusão é diferente da suposição inicial.

## O achado original da auditoria

> "3 sistemas paralelos de preço (ProdutoFornecedor, TabelaPrecoFornecedor, CotacaoItem)"

Isso foi lido inicialmente como "3 formas duplicadas de guardar a mesma informação". Depois de examinar onde e como cada um é usado de verdade, a conclusão mudou.

## O que cada sistema realmente é (não são duplicatas)

| Sistema | Papel no negócio | Natureza |
|---|---|---|
| **ProdutoFornecedor** | Aprende o código interno do material que o fornecedor usou numa cotação já processada, pra reconhecer PDFs futuros do mesmo fornecedor sem depender de descrição em texto livre. O `precoUnitario` é um valor de referência aproximado, não uma fonte de preço oficial. | Estático — 1 registro por (fornecedor, material) |
| **TabelaPrecoFornecedor** + **ItemTabelaPreco** | A lista de preço OFICIAL do fornecedor, importada de planilha padrão, com vigência mensal. É o que alimenta o Bloco 2 do Orçamento quando o usuário aplica uma tabela. | Versionado — cada importação é um snapshot novo, com vigência própria |
| **CotacaoItem** | O preço NEGOCIADO de verdade pra um empreendimento específico — o que saiu na Cotação real daquele projeto. | Por projeto — 1 conjunto de preços por Cotação |

Cada um responde uma pergunta de negócio diferente:
- ProdutoFornecedor: *"esse código do fornecedor corresponde a qual material nosso?"*
- TabelaPrecoFornecedor: *"qual é o preço de tabela vigente desse fornecedor pra esse material, nesse mês?"*
- CotacaoItem: *"quanto esse fornecedor específico cobrou pra esse projeto específico?"*

**Não existe redundância de armazenamento real aqui** — fundir essas 3 tabelas em uma só destruiria essa distinção de propósito, e migrar dados históricos de cotações e tabelas de preço já aplicadas é um risco real e desnecessário sobre dado financeiro que já aconteceu.

## O problema real (confirmado no código)

A INCONSISTÊNCIA não está no armazenamento — está na **ausência de uma regra centralizada de "qual preço vale"**. Hoje, cada tela decide sozinha, cada uma do seu jeito:
- A tela de Fornecedor mostra o preço de `ProdutoFornecedor` (referência).
- O Bloco 2 do Orçamento usa `ItemTabelaPreco` (tabela aplicada) OU `CotacaoItem` (se veio de cotação aceita) — dependendo de qual ação foi usada por último.
- Não existe uma função que responda, de forma consistente, "qual é o preço vigente de X do fornecedor Y agora, considerando todas as fontes disponíveis, em ordem de confiança".

Isso é o que causa a confusão real: duas pessoas olhando telas diferentes podem ver dois números diferentes pro mesmo material/fornecedor, sem entender a hierarquia de qual vale mais.

## Decisão de desenho

Em vez de unificar as tabelas (2.3.2 "migrar dados" fica **descartado** — não existe migração seguro a fazer aqui, os 3 tipos de dado precisam continuar existindo separados), a unificação vira uma **função de resolução única**, usada em todo lugar que precisa decidir "qual preço mostrar":

```typescript
// src/core/fornecedores/use-cases/resolver-preco-fornecedor.ts

export interface FontePreco {
  origem: "COTACAO" | "TABELA_PRECO" | "REFERENCIA";
  precoUnitario: number;
  // Contexto de onde veio, pra mostrar na tela ("Tabela Julho/2026",
  // "Cotação #123", etc.)
  detalheOrigem: string;
  data: Date;
}

/**
 * Resolve qual preço usar pra um (fornecedor, material), em ordem de
 * confiança: Cotação aceita pro projeto específico > Tabela de Preços
 * vigente > preço de referência (ProdutoFornecedor). Função pura —
 * recebe os candidatos já buscados, só decide qual vale.
 */
export function resolverPrecoFornecedor(candidatos: {
  cotacaoItem?: { precoUnitario: number; numeroCotacao: string; data: Date } | null;
  itemTabelaPreco?: { valorUnitario: number; nomeTabela: string; data: Date } | null;
  produtoFornecedor?: { precoUnitario: number } | null;
}): FontePreco | null {
  if (candidatos.cotacaoItem) {
    return {
      origem: "COTACAO",
      precoUnitario: candidatos.cotacaoItem.precoUnitario,
      detalheOrigem: `Cotação ${candidatos.cotacaoItem.numeroCotacao}`,
      data: candidatos.cotacaoItem.data,
    };
  }
  if (candidatos.itemTabelaPreco) {
    return {
      origem: "TABELA_PRECO",
      precoUnitario: candidatos.itemTabelaPreco.valorUnitario,
      detalheOrigem: `Tabela ${candidatos.itemTabelaPreco.nomeTabela}`,
      data: candidatos.itemTabelaPreco.data,
    };
  }
  if (candidatos.produtoFornecedor) {
    return {
      origem: "REFERENCIA",
      precoUnitario: candidatos.produtoFornecedor.precoUnitario,
      detalheOrigem: "Preço de referência",
      data: new Date(0), // referência não tem data específica
    };
  }
  return null;
}
```

Um wrapper de I/O (`src/infra/db/.../buscar-candidatos-preco.ts`) faz as 3 buscas e chama essa função — igual ao padrão já estabelecido na Tarefa 2.1.1.

## O que isso muda na prática (Tarefas 2.3.3 a 2.3.5, renumeradas)

- **2.3.2** (antes "migrar dados", agora "implementar resolver + wrapper de I/O") — criar a função acima + testes de caracterização (todas as combinações de candidatos presentes/ausentes).
- **2.3.3** (Cotação) — ao exibir preço sugerido durante criação de cotação, usar o resolver.
- **2.3.4** (Orçamento) — ao exibir preço de item no Bloco 2, usar o resolver, mostrando a origem (`detalheOrigem`) na tela pra transparência.
- **2.3.5** (Proposta) — sem mudança necessária (já usa o preço congelado no `ItemMaterialOrcamento`, que é o resultado final de qualquer fonte).
- **2.3.6** ("descomissionar antigos") — **cancelada**. Não há nada pra descomissionar — os 3 sistemas continuam existindo, cada um com seu papel. O que existia de "antigo" era a ausência de uma regra clara, não um sistema obsoleto.

## Risco e escopo

Baixo risco — essa mudança é **aditiva** (nova função, novos usos), não migra nem apaga nenhum dado existente. Pode ser implementada e testada incrementalmente, tela por tela, sem afetar nada que já funciona hoje.
