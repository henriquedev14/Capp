# ConstructApp — ERP de Industrialização de Kits Elétricos e Hidráulicos (by HGI Group)

> **Módulos 1 a 4 implementados:** Arquitetura, Autenticação e Controle de
> Acesso (RBAC), Cadastro de Clientes (Construtoras) e Cadastro de
> Empreendimentos — agora totalmente conectado ao banco, com listagem,
> criação, edição e mudança rápida de status.
>
> O Módulo 5 (Gestão de Documentos) ainda não existe — o card de
> "Documentos" no formulário de Empreendimento continua usando dados de
> exemplo (upload real ainda não persiste no banco/storage).

## Stack

- **Next.js 14 (App Router)** + **TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui**
- **React Hook Form** + **Zod**
- **PostgreSQL** + **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- **NextAuth v4** (Credentials Provider + `@next-auth/prisma-adapter`)
- **Docker** + **Docker Compose** (app + banco)

## Como rodar (Docker — recomendado)

```bash
cp .env.example .env
```

Edite o `.env` e troque `NEXTAUTH_SECRET` por um valor aleatório forte
(gere um com `openssl rand -base64 32`) — é obrigatório para a aplicação
iniciar corretamente.

```bash
docker compose up --build
```

Isso sobe o Postgres e a aplicação Next.js juntos. Em um terminal separado
(com os containers já rodando), crie e aplique a migration inicial, depois
rode o seed:

```bash
docker compose run --rm migrate npx prisma migrate dev --name "inicial"
docker compose run --rm migrate npm run db:seed
```

> **Por que `migrate dev` e não `migrate deploy`?** `deploy` só aplica
> migrations que já existem como arquivo `.sql` no projeto — útil em
> produção, mas inútil na primeira vez, quando ainda não existe nenhuma
> migration criada. `dev` cria a migration a partir do `schema.prisma`
> atual e já aplica. Depois da primeira migration existir, alterações
> futuras no schema também devem usar `migrate dev --name "descricao"`
> (não `deploy`) sempre que você (ou eu, ao evoluir o projeto) mudar o
> `schema.prisma`.
>
> O `docker-compose.yml` monta um volume ligando a pasta de migrations do
> container `migrate` à pasta local `src/infra/db/prisma/migrations/` —
> sem isso, qualquer migration criada ficaria presa dentro do container e
> seria perdida na próxima vez que ele for recriado, causando o erro
> "Drift detected" repetidamente. Se você já passou por isso antes desta
> correção, era exatamente essa a causa.

O seed cria o catálogo de permissões, o papel "Admin" (com todas as
permissões) e um usuário administrador inicial — as credenciais aparecem
no log do comando, ou seguem o padrão definido em `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` no `.env`. **Troque essa senha após o primeiro login.**

A aplicação fica em `http://localhost:3000` — você será redirecionado para
`/login`. O Postgres também é exposto em `localhost:5433` (não `5432`, para
evitar conflito com um Postgres já instalado na máquina — veja a nota no
`docker-compose.yml`) — usuário `erp`, senha `erp_dev_password`, banco
`erp_engenharia` — para conectar com Prisma Studio, DBeaver, etc.

## Como rodar (sem Docker, direto na máquina)

Exige um PostgreSQL acessível e Node 20+.

```bash
npm install
cp .env.example .env   # ajuste DATABASE_URL se não estiver usando o Docker,
                        # e defina NEXTAUTH_SECRET com um valor forte
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Scripts úteis

| Script                  | O que faz                                              |
|--------------------------|---------------------------------------------------------|
| `npm run dev`            | Servidor de desenvolvimento Next.js                     |
| `npm run db:generate`    | Gera o Prisma Client a partir do schema                 |
| `npm run db:migrate`     | Cria/aplica migration em desenvolvimento (interativo)    |
| `npm run db:migrate:deploy` | Aplica migrations existentes (usado em produção/Docker) |
| `npm run db:studio`      | Abre o Prisma Studio (explorar dados visualmente)        |
| `npm run db:seed`        | Popula permissões, papel Admin e usuário administrador inicial |

## Estrutura de pastas

```
.
├── Dockerfile                     # Build multi-stage da aplicação Next.js
├── docker-compose.yml             # Serviços: app, db, migrate (tarefas administrativas)
├── prisma.config.ts               # Configuração do Prisma 7 (paths, DATABASE_URL)
│
└── src/
    ├── middleware.ts              # Protege rotas — exige login, exceto /login
    │                              # (precisa estar aqui dentro, não na raiz,
    │                              # por causa do uso da pasta src/)
    ├── app/                       # Rotas (App Router) — sem regra de negócio
    │   ├── login/page.tsx         # Tela de login
    │   ├── api/auth/[...nextauth]/route.ts  # Route handler do NextAuth
    │   └── (main)/empreendimentos/novo/page.tsx
    │
    ├── components/                # Design system puro (shadcn/ui) + form fields
    │
    ├── features/                  # Cola entre UI e negócio — 1 pasta por módulo
    │   ├── empreendimentos/
    │   │   ├── components/        # EmpreendimentoForm (UI)
    │   │   ├── schemas/           # Validação Zod do formulário
    │   │   ├── actions/           # Server Actions (vazio — chega no Módulo 4)
    │   │   └── queries/           # Leituras para Server Components (idem)
    │   └── auth/
    │       ├── components/        # LoginForm, SessionProvider
    │       └── schemas/           # Validação Zod do login
    │
    ├── core/                      # Regra de negócio pura — NÃO importa Prisma/Next
    │   ├── empreendimentos/
    │   │   ├── entities/          # Empreendimento (tipo de domínio)
    │   │   ├── repositories/      # EmpreendimentoRepository (interface/contrato)
    │   │   └── use-cases/         # (vazio — chega no Módulo 4)
    │   └── auth/
    │       ├── entities/          # Usuario, Papel (tipos de domínio)
    │       ├── repositories/      # UsuarioRepository (interface/contrato)
    │       └── permissions.ts     # Catálogo central de permissões (fixo no código)
    │
    ├── infra/                     # Implementações concretas de infraestrutura
    │   ├── auth/
    │   │   ├── auth-config.ts     # Config NextAuth edge-safe (usada pelo middleware)
    │   │   ├── auth-options.full.ts  # Config completa (adapter + callbacks RBAC)
    │   │   └── next-auth.d.ts     # Extensão de tipos (session.user.papeis, etc.)
    │   └── db/prisma/
    │       ├── schema.prisma      # Modelos: Empreendimento + estrutura física +
    │       │                      # Usuario/Papel/Permissao (RBAC)
    │       ├── client.ts          # PrismaClient singleton (com driver adapter)
    │       ├── seed.ts            # Popula permissões, papel Admin, usuário inicial
    │       └── repositories/
    │           ├── empreendimento-prisma-repository.ts
    │           └── usuario-prisma-repository.ts
    │
    ├── generated/prisma/          # Prisma Client gerado (não versionado, no .gitignore)
    ├── lib/, hooks/, config/      # Utilitários e pontos de extensão futuros
```

> **Ponto de atenção (combinação menos comum):** a documentação oficial da
> Prisma testa o modo sem binário Rust (`engineType = "client"`)
> principalmente com o gerador novo `prisma-client`, recomendando usar
> `prisma-client-js` "a critério" nessa combinação. Escolhemos essa mistura
> deliberadamente para evitar o ESM forçado, mas se `npx prisma generate`
> ou `docker compose up --build` apresentar algum erro relacionado ao
> client gerado, o caminho de fallback documentado é trocar `provider` para
> `"prisma-client"` no `schema.prisma` e ajustar o import em
> `src/infra/db/prisma/client.ts` de `"@/generated/prisma"` para
> `"@/generated/prisma/client"` — a estrutura de pastas e o restante do
> código não mudam.

## Sidebar colapsável

A sidebar pode ser recolhida (modo compacto, somente ícones com tooltip) ou
expandida através do botão de menu na topbar. A preferência é salva em
`localStorage` e lembrada entre sessões.

Implementação: `src/hooks/use-sidebar.tsx` define um Context/Provider simples
(`SidebarProvider` + hook `useSidebar`) que `AppSidebar` e
`SidebarToggleButton` consomem — nenhum dos dois precisa conhecer o outro
diretamente. `MainLayout` continua sendo um Server Component; apenas as
peças que realmente precisam de estado (`SidebarProvider`, `TooltipProvider`,
`AppSidebar`, `SidebarToggleButton`) são Client Components, seguindo a
prática recomendada do App Router de manter Client Components o mais
isolados/pequenos possível.

## Identidade visual

A paleta foi extraída diretamente do site institucional do Grupo HGI:

- **Laranja primário** `#FF731D` — ação principal (botões, links, ícone ativo),
  usado com intenção, não em toda superfície da UI, para não cansar a vista
  em telas de dados densas (formulários longos, tabelas).
- **Grafite** `#2A2F36` — usado na sidebar do app, espelhando o header escuro
  do site institucional.
- Cores semânticas (sucesso, atenção, erro) permanecem verde/âmbar/vermelho
  — não foram substituídas pela cor da marca, para preservar convenções
  universais de interface (erro é sempre vermelho, nunca laranja).

Como todas as cores do projeto são tokens CSS centralizados em
`src/app/globals.css` (consumidos via classes Tailwind semânticas como
`bg-primary`, `text-accent-foreground`), trocar a paleta não exigiu editar
nenhum componente individual além da sidebar (que tem fundo de cor sólida
fixo, não tokenizado).

## Decisões de arquitetura

**Por que `prisma.config.ts` usa `process.env.DATABASE_URL` direto, em vez do
helper `env()` do Prisma?** Porque `env()` lança erro imediato se a variável
não existir — e isso quebraria `npx prisma generate` durante o build da
imagem Docker (estágio `builder`), momento em que `DATABASE_URL` ainda não
está definida (ela só é injetada em runtime, no container `app`, via
`docker-compose.yml`). Em runtime, o `client.ts` lê `DATABASE_URL` direto do
`process.env` para construir a conexão real — isso é independente do
`prisma.config.ts`, que só é usado pelos comandos do Prisma CLI.

> **Atenção para módulos futuros:** se uma página algum dia precisar
> consultar o banco em build-time (ex: `generateStaticParams`), será
> necessário disponibilizar um `DATABASE_URL` real também durante o
> `docker build` (via `--build-arg` ou um banco acessível nesse momento).
> Hoje nenhuma página faz isso, então não é um problema, mas vale lembrar.

**`core/` nunca importa Prisma, Next.js ou qualquer detalhe técnico.** A
entidade `Empreendimento` em `core/empreendimentos/entities` é um tipo
TypeScript puro. O contrato `EmpreendimentoRepository` define **o que** pode
ser feito (buscar, criar, atualizar, remover), nunca **como**. Isso é o
Dependency Inversion Principle (SOLID): a regra de negócio não depende de
detalhe de infraestrutura — é o contrário.

**`infra/` é o único lugar que sabe que existe Prisma/Postgres.**
`EmpreendimentoPrismaRepository` implementa o contrato definido em `core/`,
convertendo entre o tipo gerado pelo Prisma (que usa `Decimal` para valores
monetários, por exemplo) e a entidade de domínio pura. Se o ORM ou o banco
mudarem um dia, só esta pasta é afetada.

**Por que `prisma-client-js` + `engineType = "client"` em vez do novo
gerador `prisma-client`?** O novo gerador produz um client em formato ESM
por padrão, o que exigiria `"type": "module"` no `package.json` do projeto
inteiro — uma mudança que afetaria outros arquivos de configuração
(Tailwind, PostCSS) sem necessidade real agora. Optamos por manter
`prisma-client-js` (que gera CommonJS, compatível com a configuração padrão
do Next.js 14) combinado com `engineType = "client"`, que remove o binário
nativo Rust do client gerado. Isso é importante neste projeto porque evita
dois problemas conhecidos e bem documentados: (1) incompatibilidade do
binário nativo com Alpine/musl libc usado nas imagens Docker, e (2) falhas
do `output: standalone` do Next.js em copiar corretamente esse binário para
a imagem final. Como o projeto já usa um driver adapter (`@prisma/adapter-pg`)
desde o início, essa combinação não exige nenhuma mudança adicional.

**Por que o schema fica em `src/infra/db/prisma/` e não em `prisma/` na raiz?**
Porque, na arquitetura deste projeto, tudo que é detalhe de infraestrutura
fica isolado dentro de `infra/`. O Prisma 7 permite essa customização via
`prisma.config.ts`, então não há perda de funcionalidade.

**Por que `valorEstimado` existe no schema mas não aparece na tela de
cadastro?** Porque o negócio não vende material — vende o serviço de
industrialização dos kits. O valor real do empreendimento só existe depois
que a Engenharia faz o Levantamento Quantitativo e a Orçamentação
(Módulos 7/8) gera o documento orçamentário; não é algo que o Comercial
deva digitar "a olho" na prospecção. O campo permanece reservado no banco
(sempre `null` por enquanto) para quando o módulo de Orçamentação existir.

**Por que `Empreendimento.clienteNome` é texto solto, sem tabela `Cliente`?**
Porque o Módulo 3 (Cadastro de Clientes) ainda não foi desenvolvido, seguindo
a ordem de desenvolvimento combinada. Quando ele chegar, este campo será
substituído por uma relação real (`clienteId -> Cliente.id`) através de uma
migration aditiva que copia o texto existente — nenhum dado será perdido.

**Por que a estrutura física é uma hierarquia real (Torre → Bloco →
Pavimento → Unidade) desde já?** Porque o futuro módulo de Levantamento
Quantitativo precisa saber exatamente em qual unidade física cada kit será
instalado — não apenas "quantos apartamentos no total". Modelar isso agora
evita uma migração de dados dolorosa mais tarde.

**Por que `Unidade` aponta para `Tipologia`, e não o contrário?** Porque uma
Tipologia pode se repetir em várias Unidades dentro do mesmo empreendimento
(ex: "Tipo A" no apto 701 e no apto 702), mas cada Unidade tem exatamente uma
Tipologia.

## Módulo 2 — Autenticação e Controle de Acesso (RBAC)

**Login por e-mail e senha, sem login social.** Decisão deliberada — o
NextAuth v5/Auth.js (mais moderno) ainda está oficialmente em beta no
registro npm, e exigiria migrar de Next.js 14 para 15/16, arriscando o que
já estava validado em Docker. Optamos por `next-auth` v4 (versão estável
publicada) com o Credentials Provider.

**RBAC com três camadas: Usuario, Papel, Permissao.**
- **Papel** é editável pelo Admin via tela (CRUD completo) — ex: "Comercial",
  "Engenharia", "Admin".
- **Permissao** é fixa no código, declarada em `src/core/auth/permissions.ts`,
  com chave no formato `recurso:acao` (ex: `empreendimento:criar`). Cada
  módulo, ao ser construído, adiciona suas permissões ali. Não existe tela
  de "criar permissão do zero" — uma permissão só tem efeito real se algum
  trecho de código realmente checar por ela.
- Um usuário pode acumular **vários papéis** simultaneamente; suas
  permissões efetivas são a união de todas as permissões de todos os seus
  papéis.

**Por que `session.strategy: "jwt"` é obrigatório?** O Credentials Provider
não é compatível com sessões de banco de dados (`strategy: "database"`) —
a combinação falha silenciosamente. Por isso a sessão fica inteira no JWT,
incluindo a lista de papéis e permissões já resolvida, evitando uma consulta
ao banco a cada verificação de acesso.

**Por que existem dois arquivos de configuração do NextAuth
(`auth-config.ts` e `auth-options.full.ts`)?** O `middleware.ts` do
Next.js 14 roda em **Edge Runtime**, onde o Prisma Client com driver
adapter (`pg`, que depende de TCP sockets) não funciona — é um problema
conhecido e bem documentado da combinação Next.js + NextAuth + Prisma.
O middleware usa `withAuth({ pages: { signIn: "/login" } })` diretamente
(sem importar Prisma), que apenas decodifica o JWT já emitido usando o
`NEXTAUTH_SECRET` — sem tocar no banco. `auth-config.ts` é herdado pelo
`auth-options.full.ts` (via spread) para compartilhar `session.strategy`
e `pages` sem duplicar.
`auth-options.full.ts` é a configuração completa (com `PrismaAdapter`,
Credentials Provider real e os callbacks que consultam papéis/permissões),
usada apenas pelo route handler (`/api/auth/[...nextauth]/route.ts`), que
roda em Node.js runtime — onde o Prisma funciona normalmente.

> ⚠️ **`src/middleware.ts` precisa ficar dentro de `src/`, nunca na raiz do
> projeto.** Como este projeto usa a pasta `src/` para o App Router, o
> Next.js só reconhece o middleware se ele estiver no mesmo nível de
> `src/app`. Colocá-lo na raiz faz com que ele seja **silenciosamente
> ignorado** — sem erro nenhum, mas também sem nenhuma proteção de rota.

**Por que existe um serviço `migrate` separado no `docker-compose.yml`?**
A imagem final de produção (`runner` no Dockerfile) usa o
[standalone output](https://nextjs.org/docs/pages/api-reference/next-config-js/output)
do Next.js, que não inclui o Prisma CLI nem os arquivos-fonte necessários
para rodar `prisma migrate deploy` ou o script de seed. Em vez de inflar a
imagem de produção com essas ferramentas, o serviço `migrate` reaproveita o
estágio intermediário `builder` do mesmo Dockerfile (que já tem tudo isso)
apenas quando explicitamente chamado via `docker compose run --rm migrate ...`.

**Por que não existe tela de "criar conta"?** Por decisão de processo:
todo usuário é criado por um Admin (futuramente, pela tela de gestão de
usuários). O primeiro Admin nasce do script de seed, que já vem com um
papel "Admin" com todas as permissões e um usuário inicial — as
credenciais saem no log do comando e devem ser trocadas no primeiro acesso.

**Estrutura física no cadastro — modo simples por padrão.** O campo de
Torres tem dois modos, gerenciados por `TorresField`
(`features/empreendimentos/components/torres-field.tsx`):
- **Simples** (padrão): 3 campos únicos — quantidade de torres,
  pavimentos por torre, unidades por pavimento. Todas as torres saem
  idênticas, nomeadas automaticamente ("Torre 1", "Torre 2"...). Cobre o
  caso mais comum sem fricção de cadastro repetitivo.
- **Personalizado** (via botão "Personalizar torres"): a lista detalhada,
  onde cada torre tem nome e números próprios — para quando as torres não
  são todas iguais entre si (ex: Torre A com 20 andares, Torre B com 15).
  Trocar de modo expande o estado atual do modo simples em N linhas
  pré-preenchidas, não começa do zero.
- Na **edição**, se as torres existentes não são todas idênticas entre si
  (ex: criadas via modo personalizado), o formulário já abre direto no
  modo personalizado — para não esconder silenciosamente uma
  diferenciação que já existia.

Ao salvar, `EstruturaFisicaPrismaRepository` expande os números (de
qualquer um dos dois modos — o formato final enviado é sempre o mesmo
array de `TorreInput[]`) em registros reais de `Torre` → `Pavimento` →
`Unidade` no banco (usando `createMany` por nível, não uma query por
registro). As unidades nascem **sem tipologia atribuída** — só com a
identificação automática (ex: "0101" = pavimento 01, unidade 01).
A operação é **substitutiva**: ao editar, toda a estrutura física antiga
é apagada e recriada do zero a partir dos novos números — mais simples e
previsível do que calcular um "diff" entre estrutura antiga e nova nesta
etapa do projeto.

**Bloco é uma camada opcional no schema, não usada pelo Módulo 4.**
`Pavimento.blocoId` e `Pavimento.torreId` são ambos opcionais — o
Módulo 4 sempre usa `torreId` direto (Torre → Pavimento, sem Bloco). O
modelo `Bloco` continua existindo no schema, pronto para quando essa
camada intermediária for necessária de fato (decisão explícita de não
implementar agora, "aprofundamos depois").

**Tipologias nomeadas no cadastro.** Lista dinâmica (igual ao padrão de
"Contatos" do Cliente) onde cada tipologia tem nome, área privativa
opcional e descrição — substitutiva na edição, mesmo princípio da
estrutura física.

**Hall é uma pergunta de nível geral do empreendimento** (`temHall:
Boolean`), não por torre ou pavimento — um único campo booleano no
cadastro.

## Módulo 4 — Cadastro de Empreendimentos

**Empreendimento é a entidade central do sistema** — toda a operação da
HGI Group gira em torno dela. Por isso a página de detalhe
(`/empreendimentos/[id]`) foi estruturada com atenção redobrada: ações
rápidas (mudar status sem abrir o formulário completo) e quatro cards
reservados na coluna lateral (Engenharia, Levantamento Quantitativo,
Orçamentação, Produção) — eles existem hoje só como placeholder visual
("Módulo futuro"), mas a estrutura já está pronta para virar funcional
sem precisar redesenhar a tela inteira a cada novo módulo.

**Status com cor por grupo, não por valor individual.** Os 10 status
possíveis (Prospecção → Faturado) foram agrupados em 4 fases visuais —
`comercial` (âmbar, ainda em jogo), `encerrado` (cinza, sem sucesso),
`execucao` (azul/laranja, negócio fechado e rodando), `concluido` (verde,
sucesso) — definidas em `STATUS_EMPREENDIMENTO` em
`features/empreendimentos/constants.ts`. O objetivo é permitir escanear a
listagem rapidamente sem precisar ler o texto de cada status.

**Todo empreendimento nasce em "Prospecção" — não é uma escolha do
usuário na criação.** O campo de status fica oculto (substituído por um
texto fixo) no formulário de criação, e só aparece como seletor editável
na edição. Essa regra é reforçada em duas camadas: a UI esconde a opção
de escolher, e `CriarEmpreendimentoUseCase` ignora qualquer valor de
status que porventura chegasse e força `"PROSPECCAO"` sempre.

**Cliente precisa existir e estar ativo.** `CriarEmpreendimentoUseCase` e
`AtualizarEmpreendimentoUseCase` (em `core/empreendimentos/use-cases/`)
validam isso antes de qualquer escrita no banco — não é só uma restrição
de UI (o seletor de cliente já filtra só ativos), é uma regra de negócio
verificada no `core/`, que protegeria o sistema mesmo se outro ponto de
entrada (uma futura API, um script de importação) tentasse pular a
validação da tela.

**Controle de acesso por permissão, não por papel.** As Server Actions
(`criarEmpreendimento`, `atualizarEmpreendimento`,
`mudarStatusEmpreendimento`) chamam `exigirPermissao()` — um helper em
`infra/auth/exigir-permissao.ts` reutilizável por qualquer módulo futuro —
que verifica `empreendimento:criar`/`empreendimento:editar` na sessão do
usuário, lançando erro se ausente. Isso é checado no servidor, não apenas
escondendo botões na UI.

## Navegação e gestão de Clientes — correções

Todas as telas de Cliente e Empreendimento (listagem, criação, detalhe,
edição) agora têm um link "Voltar" no topo, evitando depender só do menu
lateral para navegar entre telas relacionadas.

**Inativar Cliente** está conectado de fato — `InativarClienteButton` na
página de detalhe chama a Server Action `inativarCliente` com confirmação
em duas etapas (abre um menu explicando o efeito, exige clique extra para
confirmar).

**Bug corrigido:** a Server Action `inativarCliente` tinha uma checagem
de "tem empreendimentos vinculados" que **bloqueava** a inativação — mas
a mensagem de erro dizia o contrário ("pode ser inativada mas não
excluída"). Essa checagem fazia sentido para uma futura ação de
*exclusão* (que ainda não existe), não para inativação — o caso de uso
mais comum de inativar é justamente uma construtora com empreendimentos
no histórico, com quem a HGI não trabalha mais. A função foi reescrita
para permitir inativação independente de empreendimentos vinculados.

## Tierização de Clientes (reservado para uso futuro)

`Cliente.tier` (enum `TierCliente`: `TIER_1` / `TIER_2` / `TIER_3`) está
reservado no schema para classificar construtoras por porte/importância
estratégica — mesmo padrão já usado para `Empreendimento.valorEstimado`:
campo existe no banco e na entidade de domínio, mas nenhuma tela ainda o
edita (sempre `null` até que essa funcionalidade seja desenvolvida de
fato).

## O que ainda falta (próximos módulos)

- Módulo 5 — Gestão de Documentos: upload real (storage + persistência),
  hoje o card de Documentos no formulário usa dados de exemplo
- Módulos 6/7/8 — Engenharia, Levantamento Quantitativo e Orçamentação:
  os 4 cards reservados na página de detalhe do Empreendimento
  (`/empreendimentos/[id]`) viram funcionais quando esses módulos chegarem
- Tela de gestão de usuários e papéis para o Admin (CRUD via UI) — hoje
  isso só é possível diretamente no banco ou via Prisma Studio
- `valorEstimado` continua `null` em todo registro — só passa a existir
  quando o Módulo 8 (Orçamentação) for desenvolvido

## Banco de dados — diagrama de relacionamento (visão atual)

```
Empreendimento 1───* Torre 1───* Bloco 1───* Pavimento 1───* Unidade *───1 Tipologia
                                                                              ▲
                                                              Empreendimento 1┘
                                                              (Tipologia pertence
                                                               a um único Empreendimento)
```
