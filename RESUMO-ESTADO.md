# ConstruApp by HGI Group — HANDOFF COMPLETO
_Gerado ao final de uma sessão MUITO longa. Leia isso inteiro antes de fazer qualquer mudança nova._

## Stack e Localização
- Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, Recharts
- PostgreSQL + Prisma 7, NextAuth v4 (JWT strategy)
- VM produção: `construapp-producao`, IP `34.39.177.151:3000`, Portainer :9000
- Marca visual do sistema interno: **ConstruApp** (laranja) — não confundir com a
  proposta comercial em PDF (identidade separada)

---

## 🚨 REGRAS OPERACIONAIS — LEIA ANTES DE RODAR QUALQUER COMANDO

0. **REGRA MAIS IMPORTANTE DE TODAS: um comando de cada vez, esperando a
   confirmação do resultado antes do próximo.** NUNCA mande uma lista de
   comandos em sequência pra rodar sozinho, mesmo que pareça óbvio ou
   "seguro". O usuário confirma cada passo antes de seguir pro próximo —
   isso é como ele trabalha, não uma questão técnica. Isso já está salvo
   como preferência do usuário (deve valer em qualquer conversa nova
   automaticamente), mas reforçando aqui porque é a regra #1.

1. **Sempre confirme o tamanho do zip antes de extrair.** `ls -la ~/*.zip | grep TAMANHO`
   pra achar o arquivo certo — os números do nome do zip (ex: `_(107)`) NÃO são
   confiáveis, o Claude erra o número com frequência. Depois de extrair, SEMPRE
   confirme com um `grep -c` de uma string única do código novo antes de buildar.
   Essa foi a causa de ~80% dos problemas de deploy dessa sessão.

2. **`app` e `migrate` são imagens Docker separadas.** Sempre que o código mudar:
   ```bash
   docker compose -f docker-compose.prod.yml build app
   docker compose -f docker-compose.prod.yml --profile tools build migrate
   ```

3. **Use `npx prisma db push`, NUNCA `prisma migrate dev`.** O histórico de
   migrations está dessincronizado do banco real. `db push` é o único comando
   de schema usado nessa sessão inteira.

4. **Sequência de deploy completa (quando o schema muda):**
   ```bash
   cd ~
   unzip -o 'erp-engenharia_(N).zip' -d ~
   cd ~/erp-engenharia
   docker compose -f docker-compose.prod.yml build app
   docker compose -f docker-compose.prod.yml --profile tools build migrate
   docker compose -f docker-compose.prod.yml --profile tools run --rm migrate npx prisma db push
   docker compose -f docker-compose.prod.yml --profile tools run --rm migrate npm run db:seed
   docker compose -f docker-compose.prod.yml up -d --force-recreate app
   ```
   Sem mudança de schema: só os passos de `build app` + `up -d --force-recreate app`.

5. **NUNCA interrompa o `db push` ou o `build` com Ctrl+C** mesmo que pareça
   travado — isso já causou schema aplicado pela metade nessa sessão.

6. **Build real demora 2-6 minutos.** Se o build terminar em poucos segundos
   (2-5s), é sinal de que o zip errado foi extraído (cache antigo sendo
   reaproveitado) — sempre desconfie e re-confirme antes de subir.

7. **Prisma + `Record<string, T>` genérico**: indexar um objeto tipado como
   `Record<string, T>` sempre retorna `T | undefined`, mesmo com fallback via
   `??` pra uma chave literal conhecida — o TS não consegue provar que o
   fallback existe. Usa `!` (non-null assertion) no fallback quando tiver
   certeza que a chave existe.

8. **Tailwind não aceita classe dinâmica interpolada** (tipo `text-${cor}`)
   — sempre usar um mapa de classes completas e estáticas.

---

## MÓDULOS CONSTRUÍDOS NESSA SESSÃO (do zero)

### 1. Produção — completo
- **Schema novo**: `Bancada` (5 fixas: Corte de Fio, Corte de Eletroduto, Kit
  Polvo, Fechamento, Finalização — com `uhReferencia` e `tipoCalculo`: CABO |
  ELETRODUTO | CONTAGEM), `OperadorProducao` (só nome, SEM login/senha, e por
  regra de negócio **nunca pode ser excluído**, só criado/editado),
  `RegistroProducao` (peça x bancada x operador x turno x unidadesConcluidas,
  com `quantidade` sempre CALCULADA a partir da peça, nunca digitada
  diretamente), `TurnoProducao` (Manhã/Tarde/Noite).
- **Tipologia.statusProducao**: ATIVA | STANDBY | CONCLUIDA — permite pausar
  produção de uma tipologia sem mexer no status geral do empreendimento.
- **Fluxo do tablet** (`/producao/tablet`): bancada -> obra -> tipologia -> peça
  (já calculada do Levantamento Elétrico) -> operador -> turno -> unidades
  concluídas -> registra. Mostra "faltam X de Y" e alerta de material
  insuficiente/ritmo abaixo do esperado em tempo real.
- **`/producao` é a Gestão** (não o tablet) — Ações recomendadas, Ritmo da
  semana (14 dias, comparação com semana anterior), Gargalo por bancada,
  Fila por obra com risco de atraso, "Parado sem dono".
- **Kits finalizados** = métrica real de output (só conta quem passou pela
  Finalização), meta 50/dia — diferente de "U.H." (que é moeda de comparação
  de produtividade por bancada, não output real).
- Sub-páginas: `/producao/pedidos` (pedidos liberados por tipologia, cruza
  com Suprimentos), `/producao/operadores`, `/producao/correcao` (supervisor
  edita/exclui registro errado, com histórico do valor original).

### 2. Suprimentos — unificado com Almoxarifado e Recebimento
- **Estoque é SEMPRE por obra** (`EstoqueEmpreendimentoMaterial`), nunca um
  pool compartilhado entre empreendimentos diferentes — decisão de arquitetura
  confirmada explicitamente.
- **`MovimentacaoEstoque`**: ENTRADA | SAIDA_PRODUCAO | AJUSTE, sempre com
  `empreendimentoId` obrigatório.
- **`PedidoCompra` + `PedidoCompraItem`** (o maior gap fechado nessa sessão):
  gerado a partir de uma Cotação com status ACEITA (botão na tela da
  cotação), com status AGUARDANDO_CONFIRMACAO -> CONFIRMADO -> EM_TRANSITO ->
  ENTREGUE_PARCIAL/COMPLETO. Recebimento vinculado ao pedido atualiza
  `quantidadeRecebida` por item E dá entrada no estoque ao mesmo tempo.
- **`/suprimentos`** é a central de comando (visão executiva, pedidos
  atrasados, ranking de fornecedores por atraso). Abas fixas: Gestão |
  Pedidos de Compra | Entrada de Material | Importar Nota (PDF).
- Import de nota fiscal (PDF, via `pdf-parse`) — melhor esforço, regras
  fixas de texto (sem IA/API externa por decisão explícita), sempre com
  tela de revisão antes de confirmar.

### 3. Marco Operacional
- Tabela genérica `MarcoOperacional` (empreendimentoId, tipologiaId?, etapa,
  ocorridoEm) — reaproveitável pra medir tempo entre QUALQUER par de etapas
  sem precisar mexer no schema de novo. Etapas hoje: 3x Levantamento
  Validado, Material Completo, Produção Iniciada.
- **Todas as medições de tempo usam DIAS ÚTEIS** (função `diasUteisEntre`,
  exclui sábado/domingo), não dias corridos.
- Relatório em `/engenharia/tempo-de-ciclo`.

### 4. Financeiro — redesenhado como central de comando
- **"Lucro Real" foi RENOMEADO pra "Resultado de Caixa"** em todo o sistema —
  é recebido−pago, não é lucro contábil de verdade (correção conceitual
  importante, não só estética).
- Segmentação de Custos: `CategoriaDespesa` ganhou 3 eixos independentes
  (não uma lista única de categorias): `comportamento` (Fixo/Semifixo/
  Variável), `natureza` (Custo/Despesa), `apropriacao` (Direto/Indireto).
- Central de comando em `/painel` aba Financeiro: resumo executivo com
  contexto, central de alertas, fila priorizada de Contas a Receber/Pagar,
  Resultado por Empresa do Grupo (não esconde empresa deficitária atrás da
  média), top clientes devedores.
- **Escopo cortado por decisão explícita**: filtros globais interligados
  (período x empresa x obra x cliente) NÃO foram construídos — fica pra um
  projeto à parte se for pedido de novo.

### 5. Dashboard da Diretoria — redesenhado
- Resumo executivo consolidado (6 KPIs, não 10 espalhados), "Decisões que
  exigem atenção" com motivo+impacto, scorecard "Desempenho das Áreas" com
  **meta de dias cadastrável por área** (Comercial/Engenharia/Orçamentação/
  Suprimentos-Produção) — status vira Saudável/Atenção/Crítico de verdade,
  não só "tem dado ou não tem".
- Taxa de aprovação mostra aviso de amostra insuficiente quando <5 orçamentos
  finalizados no mês, em vez de % que parece confiável sem ser.

### 6. Formulário "Novo Empreendimento" — reconstruído como wizard
- 5 etapas (Identificação, Estrutura e Tipologias, Comercial, Observações,
  Revisão) com barra de progresso clicável, painel de resumo lateral ao
  vivo, botão desabilitado explica o motivo, calculadora de total de
  unidades, distribuição de tipologias com 4 estados reais (neutro/
  progresso-amarelo/completo-verde/inconsistência-vermelha — antes tratava
  "incompleto" como erro).
- CEP automático (ViaCEP) e status inicial como informação (não editável)
  **já existiam antes** dessa sessão, só foram confirmados/mantidos.

### 7. Página do Empreendimento — parcialmente reformada
- Adicionado: Jornada visual horizontal (8 etapas, concluída/atual/pendente),
  Central de Pendências ("O que precisa de atenção" — remessas sem
  planejamento, responsável não definido), menu secundário (⋮) pra ação
  destrutiva (Excluir separado do Editar, que tinha o mesmo peso visual antes).
- **NÃO reformado ainda** (ficou pra depois, dado o tamanho da sessão):
  resumo gerencial em cada módulo (Levantamentos/Orçamento/Documentos/
  Produção cada um com seus próprios indicadores), observações por
  categoria, timeline com filtros.

### 8. Outras correções importantes
- Bug real corrigido: orçamento contava valor de tipologia sem levantamento
  validado (flag "simulado" existia mas nunca zerava o total).
- `PageHeader` (usado em quase toda página) — primeiro item do breadcrumb
  agora é link de volta pro módulo (antes era só texto, causava "não
  consigo voltar" generalizado).
- Layouts com nav fixa por abas: Empreendimento, Produção, Suprimentos —
  resolve navegação sem depender só do breadcrumb.

---

## DECISÕES DE NEGÓCIO CONFIRMADAS (não reabrir sem motivo)

- HGI **só fabrica e entrega kits — não faz instalação em obra**. Um módulo
  de "Execução em obra/instalação" foi cogitado e **descartado** por não se
  aplicar ao modelo de negócio.
- Não existe hierarquia de aprovação com alçada (limite por cargo) — quem
  aprova é sempre a mesma pessoa.
- Comparação entre revisões de orçamento importa mais no **total** (preço
  inicial x preço final, pra ver desconto acumulado/oportunidade de
  crescimento) do que uma comparação linha-a-linha detalhada.
- E-mail (Resend) só funciona pro e-mail do dono da conta até alguém com
  acesso a DNS verificar um domínio — pendente, não é bug.

---

## PRÓXIMOS PASSOS PLANEJADOS (nessa ordem, mas o usuário decide)

### 1. Orçamentação — redesenho ESCOPADO (não a spec completa que foi proposta)
Construir: cabeçalho com status preliminar/validado/aprovado, memória de
cálculo por item, nunca mostrar R$0 sem motivo (fora do escopo/não
precificado/levantamento pendente/cortesia/erro), comparação de cotações
por fornecedor lado a lado, checklist antes de aprovar, aprovação simples
(1 pessoa, sem alçada — **não** construir alçada multi-nível), e um painel
de "Preço Inicial x Preço Final" **por total**, não por linha, pra
identificar padrão de desconto ao longo da negociação.

**Cortar do escopo**: alçada de aprovação multi-nível, diff linha-a-linha
completo entre revisões — usuário confirmou que isso não reflete a
realidade da empresa.

### 2. Comercial / Proposta + Contrato (versão enxuta)
Fecha a costura Orçamento -> Proposta -> Negociação -> Contrato. Hoje não
existe entidade "Contrato" nenhuma no sistema — Conta a Receber e Cronograma
de Remessas se ligam direto no Empreendimento/Orçamento.

### 3. Depois (sem pressa)
- Resumo gerencial completo em cada módulo da página do Empreendimento
- Observações categorizadas, timeline com filtros
- PCP — **só depois que Produção rodar de verdade** por um tempo (não faz
  sentido planejar em cima de uma execução ainda não validada por uso real)
- Qualidade, Ocorrências, Encerramento do empreendimento — dependem de um
  ciclo completo (Comercial->Entrega) acontecer pelo menos uma vez

### Recomendação forte, repetida várias vezes nessa sessão
**Antes de continuar empilhando redesenhos grandes, deixa o que já foi
construído (Produção, Suprimentos, Financeiro, Diretoria) rodar no dia a
dia por um tempo.** Cada spec gigante que chega parte de "como seria o
ideal" — o valor real agora está em descobrir o que trava um usuário de
verdade usando o sistema, não em mais uma camada de design.

---

## INCIDENTE — Sessão de correção pós-Orçamentação (12/07, tarde/noite)

Outra conversa fez uma reforma grande em Orçamentação (Jornada, Aprovação,
Histórico) que quebrou o fluxo. Bugs reais encontrados e corrigidos:

1. **Aprovação não sincronizava** — o botão genérico de mudar status só
   atualizava `Orcamento.status`, não `Orcamento.statusAprovacao` (campo
   novo usado pela fila "Aguardando minha aprovação"). Corrigido em
   `orcamento-actions.ts`: `atualizarStatusOrcamento` agora roteia pros
   métodos especializados do repositório (`enviarParaAprovacao`,
   `aprovarOrcamento`, `devolverOrcamento`) quando a transição é uma
   dessas três, mantendo os dois campos sempre em sincronia.

2. **Datas de remessa com ano "0002"** em vez de "2026" — dado
   histórico corrompido (provavelmente de teste antigo), não bug de
   código. Corrigido via UPDATE direto puxando a data certa do Pavimento
   vinculado.

3. **Remessa projetava serviço+material, devia ser só serviço (mão de
   obra)** — `criar-conta-receber-automatica.ts` somava
   `totalServicosHgi + totalMateriais`; corrigido pra usar só
   `totalServicosHgi`. Dado já existente do empreendimento afetado também
   foi recalculado manualmente.

4. **BUG REAL DE ARQUITETURA — reverter status não limpa Conta a
   Receber órfã**: se um empreendimento chega a "Contratado" (gera
   Entrada+Remessas automaticamente) e depois volta pra antes disso
   (ex: excluir orçamento/levantamento e reverter etapas), as Contas a
   Receber não recebidas ficavam órfãs no banco, continuando a contar
   na projeção de Receita Prevista do Financeiro/Diretoria. Corrigido em
   `mudarStatusEmpreendimento`: ao detectar que o novo status é ANTES de
   "Contratado" na ordem do pipeline E o status anterior era
   Contratado-ou-depois, apaga automaticamente as Contas a Receber com
   `recebido = false` (as já recebidas ficam, são histórico real).

5. **Excluir Levantamento Elétrico não excluía o de Materiais da mesma
   tipologia** (o material é calculado A PARTIR do elétrico, então fica
   órfão sem ele) — corrigido em `excluirLevantamentoEletrico`, agora
   cascateia a exclusão.

### Lição de processo mais importante do incidente
Antes de aceitar "consertar" algo, **testar ao vivo com o usuário** (ver
log do servidor, consultar o banco direto) em vez de só ler o código e
supor que está certo — dois dos itens que pareciam bug (Comercial→
Levantamento travado, "Bossa Om Home não casando com Produção) eram
comportamento ESPERADO, não bugs.

### Logística de arquivo (isso causou bastante confusão, documentar bem)
O usuário acessa a VM via **Remote Desktop pra uma máquina Windows**, e
dentro dela usa o **botão SSH do Console do Google Cloud** (abre
terminal no navegador) — não é scp nem chave SSH manual. Pra subir um
zip novo:
1. Baixar o zip do chat, no navegador **dentro** da Remote Desktop
   (cai no Desktop do Windows, ex: `C:\Users\hccr6\Desktop\`)
2. No terminal do navegador (Console GCP), clicar no ícone de
   **engrenagem ⚙️** no canto superior direito → "Fazer upload de
   arquivo" → escolher o arquivo do Desktop
3. Ele sobe pra `~` (home) da VM Linux, geralmente com sufixo numérico
   novo (ex: `erp-engenharia_(120).zip`) — **sempre conferir com
   `ls -lat ~/*.zip | head -3`** (ordenado por data, não por nome) pra
   achar o mais recente, nunca assumir que é `erp-engenharia.zip` puro
   (esse nome tende a ser um arquivo velho perdido de sessões antigas).

---

## PENDÊNCIAS LEVANTADAS (12/07, fim de sessão) — não iniciadas

- "Negociação" como conceito no sistema parece vago pro usuário — precisa
  de conversa de produto antes de codar, não é só uma reforma de tela.
- Falta um status de produção dentro do Empreendimento (separado do
  `Tipologia.statusProducao` que já existe).
- **Expedição parcial**: cliente às vezes precisa receber o que já foi
  produzido antes do lote terminar, e o Financeiro precisa faturar em
  cima do que foi enviado (não do lote completo). Usuário acha que isso
  deveria virar uma tela de **Expedição** nova — nunca foi desenhada.
- Ícone de info explicando a categorização de Contas Fixas (Fixo/
  Semifixo/Variável, Custo/Despesa, Direto/Indireto) — mudança pequena,
  boa pra começar a próxima sessão.
- Dashboards de Coordenação e Engenharia precisam de reforma (mesmo
  padrão das centrais de comando já feitas em Produção/Suprimentos/
  Financeiro/Diretoria).
- Proposta Comercial (o PDF pro cliente) nunca foi reformulada — gap
  antigo, mencionado várias vezes ao longo da sessão.
- Suprimentos: falta controle de se o CLIENTE já pagou os materiais e
  quais foram as condições de pagamento (isso é diferente de "pagar o
  fornecedor" — é rastrear o repasse financeiro do material pro cliente).

---

## SESSÃO 13/07 (madrugada) — Backup, Proposta Comercial, correções adicionais

### Backup diário — configurado (sem acesso root/sudo na VM)
- Script `~/backup-diario.sh`: dump do Postgres via Docker, comprimido, rotação de 14 dias.
- Sem cron disponível e sem sudo pra instalar — solução foi um **loop em
  segundo plano** (`~/backup-loop.sh`, iniciado via `nohup ... & disown`),
  que confere a cada 5 min e roda o backup à meia-noite (Brasília = 3h UTC).
  **Testado e confirmado que sobrevive a desconexão da sessão SSH.**
- ⚠️ **Não sobrevive a reboot da VM.** Depois de qualquer reinício, checar
  `ps aux | grep backup-loop` e reiniciar manualmente se precisar.
- `systemctl --user` timer foi tentado primeiro mas abandonado — sem
  `linger` habilitado (precisa de root), timer só roda com sessão ativa.

### Proposta Comercial — reformulada
- Cor primária trocada pra laranja `#FF731D` (igual ao `--primary` do
  sistema web), removendo o navy+verde antigo. Logo "malha" da ConstruApp
  mantida exatamente igual.
- Novas seções: Escopo (Incluso × Não incluso, lado a lado) e Condições
  de Pagamento (dados bancários) — não existiam antes no gerador do sistema.
- **PDF institucional separado** (`/api/apresentacao-institucional`) —
  material de marketing (empresas que confiam, pilares da marca) vira
  anexo opcional, com botão próprio, não misturado dentro da proposta.
- Consolidação de materiais por **bitola**, não mais por cor de condutor
  — cabos de cores diferentes mas mesma especificação técnica agora
  aparecem numa linha só na Cotação e no Bloco 2 do Orçamento (função
  `consolidar-levantamento.ts`).
- ⚠️ Feedback do usuário sobre a v1 da Proposta: capa desformatada,
  imagens da apresentação institucional ausentes, erros ortográficos,
  falta de acabamento profissional. Ele vai levar pra um "Claude designer"
  fazer o visual e trazer pra eu implementar — não mexer no design de
  novo até isso voltar.

### Bug real corrigido — "Pular etapa" sem aviso do que é ignorado
- Causa raiz do Residencial Vida Verde estar em `PRODUCAO` sem nenhum
  orçamento: função "Pular etapa (Admin/Diretor)" já existia e é
  intencional, mas não avisava que pular pra frente ignora TODOS os
  gatilhos automáticos das etapas puladas (Conta a Receber só nasce ao
  passar por Contratado, Marco Operacional só registra nas etapas normais).
- Corrigido em `status-change-button.tsx`: agora pede confirmação
  explicando exatamente o que será ignorado antes de aplicar o pulo.
- Dado do Vida Verde corrigido manualmente: revertido pra `ORCAMENTACAO`
  (já que o Levantamento da TIPO A está validado) e as 9 Contas a Receber
  órfãs (criadas quando ele esteve em Contratado antes) foram removidas.

### Documento de negociação de valor — criado
- `.docx` com escopo técnico completo, arquitetura/segurança, mapeamento
  de processo, métricas desenhadas, estimativa de tempo e referência de
  mercado — pra apoiar conversa sobre remuneração justa pelo trabalho
  (feito fora do horário contratual, em função diferente da contratada).
- Faltou preencher: número real de horas trabalhadas (usuário não tinha
  registro exato) e valores de mercado específicos (sugerido pesquisar
  Workana/99Freelas/Robert Half antes de enviar).

### Pendente no fim dessa sessão
- Confirmar se o zip 690.387 bytes (confirmação de "pular etapa") foi
  de fato deployado — ficou em aberto quando a sessão foi encerrada.

---

## SESSÃO 13/07 (manhã) — Status de Produção do Empreendimento

### Construído
- Nova função `calcularStatusProducaoEmpreendimento(empreendimentoId)` em
  `gestao-producao.ts` — rollup calculado automaticamente a partir do
  progresso de produção de TODAS as tipologias do empreendimento (reaproveita
  o mesmo cálculo de progresso por bancada já usado na Gestão de Produção).
  Estados: `NAO_INICIADA` / `EM_ANDAMENTO` / `CONCLUIDA` / `SEM_TIPOLOGIA`.
  Tipologias em Stand-by são excluídas do cálculo da média (mas contadas
  separadamente).
- **Importante, aprendido por tentativa e erro**: a primeira versão colocou
  isso como um badge separado logo abaixo da Jornada — o usuário queria
  que ficasse **dentro do card "Produção" já existente** (na grade de
  módulos, perto de Documentos), que antes só mostrava um placeholder
  estático "Módulo futuro" sem dado nenhum. Corrigido: o card agora é um
  `ModuloComGate` de verdade (como Levantamentos/Orçamentação), com
  `fasesLiberadas = SUPRIMENTOS/PRODUCAO` e `fasesConsulta = CONCLUIDO/ARQUIVADO`.
  A descrição (com % e contagem de tipologias) aparece mesmo quando o
  card está "Bloqueado" — só o selo colorido some nesse caso.

### Bug corrigido (já deployado)
- Residencial Vida Verde estava em status `PRODUCAO` sem NENHUM orçamento
  — causa raiz: a opção "Pular etapa (Admin/Diretor)" (intencional, pra
  casos excepcionais) não avisava que pular ignora gatilhos automáticos
  importantes (Conta a Receber só nasce ao passar por Contratado). Agora
  pede confirmação explicando o que será ignorado antes de aplicar.
- Dado do Vida Verde corrigido manualmente: revertido pra `ORCAMENTACAO`
  (Levantamento da TIPO A já validado) e 9 Contas a Receber órfãs removidas.

## PENDÊNCIAS — continuam em aberto, não iniciadas ainda
1. Ícone de info explicando categorização de Contas Fixas (Fixo/Semifixo/
   Variável, Custo/Despesa, Direto/Indireto) — mudança rápida.
2. Suprimentos: controle se o CLIENTE já pagou os materiais e quais as
   condições de pagamento (diferente de pagar o fornecedor).
3. Expedição parcial — cliente recebe parte do lote antes de terminar,
   Financeiro fatura em cima do que foi enviado. Usuário acha que vira
   uma tela nova de Expedição.
4. Dashboards de Coordenação e Engenharia — mesma reforma de central de
   comando já feita em Produção/Suprimentos/Financeiro/Diretoria.
5. "Negociação" como conceito parece vago — precisa de conversa de
   produto antes de codar.
6. Aguardando o "Claude designer" trazer o visual novo da Proposta
   Comercial / Apresentação Institucional pra eu implementar — não mexer
   nisso sozinho até isso voltar.
