# Fluxo de Trabalho — ConstruApp

Documento curto, vivo — atualiza conforme o processo evoluir (ex: quando o staging da Tarefa 1.1.3 existir).

## Branches

- `main` — sempre reflete o que está (ou deveria estar) rodando em produção. Nunca editar direto.
- `tarefa/<id>-<descricao-curta>` — uma branch por tarefa do Plano Mestre de Refatoração (ex: `tarefa/1.2.1-hash-token-reset`).
- `fix/<descricao-curta>` — correção pontual fora do plano (bug reportado em produção).
- `feature/<descricao-curta>` — funcionalidade nova fora do plano.

## Passo a passo de uma mudança

1. Criar a branch a partir da `main` atualizada:
   `git checkout main && git pull && git checkout -b tarefa/1.2.1-hash-token-reset`
2. Fazer a mudança (Claude prepara os arquivos/comandos, Henrique aplica via terminal).
3. Commitar: `git add . && git commit -m "mensagem clara do que mudou"`.
4. Subir a branch: `git push -u origin tarefa/1.2.1-hash-token-reset`.
5. Abrir um Pull Request no GitHub (mesmo sendo revisão solo — dá visão clara do diff antes de aceitar).
6. Merge na `main` pelo botão do GitHub.
7. Puxar a `main` atualizada na VM: `git checkout main && git pull`.
8. Deploy a partir da `main` (processo de build/deploy de sempre — automatiza quando o staging existir).

## Regras

- Nada é commitado direto na `main`.
- Cada branch corresponde a UMA tarefa/mudança — não misturar correções diferentes na mesma branch.
- Mensagem de commit em português, direta, descrevendo O QUE mudou.
- Antes de abrir PR: confirmar que nenhum `.env`/segredo aparece no diff (`git status` e `git diff` antes de commitar).
