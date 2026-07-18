/**
 * Catálogo central de permissões do sistema.
 *
 * Cada módulo, ao ser construído, declara aqui as permissões que introduz.
 * A chave (string) é o que fica salvo na tabela Permissao e referenciado
 * pelos Papéis — o nome da constante é só para uso ergonômico no código
 * (autocomplete, refatoração segura).
 *
 * IMPORTANTE: alterar o valor de uma chave já em uso quebra a associação
 * com os Papéis existentes no banco. Prefira adicionar uma nova chave e
 * depreciar a antiga via migration, nunca renomear em -place.
 */
export const PERMISSOES = {
  // Módulo: Administração (gestão de usuários, papéis e permissões)
  ADMIN_GERENCIAR_USUARIOS: "admin:gerenciar_usuarios",
  ADMIN_GERENCIAR_PAPEIS: "admin:gerenciar_papeis",
  // Editar a tabela de preço base (por kit/área) e os multiplicadores de
  // Tier usados na orçamentação — decide o valor cobrado pela HGI.
  ADMIN_GERENCIAR_PRECOS: "admin:gerenciar_precos",

  // Módulo: Clientes (Construtoras)
  CLIENTE_VER: "cliente:ver",
  CLIENTE_CRIAR: "cliente:criar",
  CLIENTE_EDITAR: "cliente:editar",
  // Ativar e inativar são a mesma permissão — quem pode uma pode a outra.
  // Por decisão de negócio, apenas Admin e usuários com papel Diretor
  // (criado pelo Admin e com esta permissão atribuída) podem realizar
  // esta ação.
  CLIENTE_ATIVAR_INATIVAR: "cliente:ativar_inativar",
  // Definir o Tier (0-3) do cliente — restrito a Admin e Diretor, pois
  // define diretamente o multiplicador de preço aplicado nos orçamentos.
  CLIENTE_DEFINIR_TIER: "cliente:definir_tier",

  // Módulo: Empreendimentos
  EMPREENDIMENTO_CRIAR: "empreendimento:criar",
  EMPREENDIMENTO_EDITAR: "empreendimento:editar",
  EMPREENDIMENTO_VER: "empreendimento:ver",
  EMPREENDIMENTO_EXCLUIR: "empreendimento:excluir",
  EMPREENDIMENTO_ANOTAR: "empreendimento:anotar",
  EMPREENDIMENTO_LEVANTAMENTO: "empreendimento:levantamento", // adicionar anotações na timeline
  // Ajustar o Tier específico deste empreendimento (pode divergir do tier
  // padrão do cliente) — mesma restrição de Admin/Diretor.
  EMPREENDIMENTO_DEFINIR_TIER: "empreendimento:definir_tier",

  // Assumir/concluir a responsabilidade por uma etapa específica do
  // empreendimento — cada uma restrita a quem realmente atua naquela
  // área (antes, qualquer usuário podia "assumir" qualquer etapa, mesmo
  // sendo de outro setor, o que quebrava o próprio propósito de
  // accountability da funcionalidade).
  RESPONSABILIDADE_COMERCIAL: "responsabilidade:comercial",
  RESPONSABILIDADE_ENGENHARIA: "responsabilidade:engenharia",
  RESPONSABILIDADE_ORCAMENTACAO: "responsabilidade:orcamentacao",

  // Dar o aval para gerar a proposta comercial de uma tipologia — exige
  // que os levantamentos estejam validados. Restrito a Diretor/Coordenador.
  EMPREENDIMENTO_APROVAR_PROPOSTA: "empreendimento:aprovar_proposta",

  // Aprovar/devolver o Orçamento em si (fluxo novo, separado da aprovação
  // de proposta por tipologia acima) — quem decide se o orçamento como um
  // todo pode seguir para geração de proposta.
  ORCAMENTO_APROVAR: "orcamento:aprovar",
  // Atribuir responsável e prazo, e editar a jornada/etapas do orçamento.
  ORCAMENTO_GERENCIAR_JORNADA: "orcamento:gerenciar_jornada",

  // Módulo: Fornecedores
  FORNECEDOR_VER: "fornecedor:ver",
  FORNECEDOR_CRIAR: "fornecedor:criar",
  FORNECEDOR_EDITAR: "fornecedor:editar",
  FORNECEDOR_ATIVAR_INATIVAR: "fornecedor:ativar_inativar",

  // Módulo: Financeiro (Empresas do Grupo, Categorias de Despesa, Contas a Pagar)
  // Acesso restrito por natureza — dado financeiro sensível da empresa.
  FINANCEIRO_VER: "financeiro:ver",
  FINANCEIRO_GERENCIAR_CADASTROS: "financeiro:gerenciar_cadastros", // Empresas do Grupo + Categorias de Despesa
  FINANCEIRO_LANCAR_CONTA: "financeiro:lancar_conta", // criar/editar contas a pagar
  FINANCEIRO_BAIXAR_CONTA: "financeiro:baixar_conta", // marcar como paga
  FINANCEIRO_EXCLUIR_CONTA: "financeiro:excluir_conta",

  // Módulo: Segurança da Informação
  SEGURANCA_VER_LOG: "seguranca:ver_log",

  // Módulo: Analytics — controla qual(is) aba(s) de dashboard cada papel
  // enxerga. Sem nenhuma dessas marcadas, a pessoa não vê nenhuma aba
  // (Admin tem todas automaticamente, como qualquer outra permissão).
  DASHBOARD_VER_DIRETORIA: "dashboard:ver_diretoria",
  DASHBOARD_VER_COORDENACAO: "dashboard:ver_coordenacao",
  DASHBOARD_VER_COMERCIAL: "dashboard:ver_comercial",
  DASHBOARD_VER_ENGENHARIA: "dashboard:ver_engenharia",
  DASHBOARD_VER_ORCAMENTACAO: "dashboard:ver_orcamentacao",
  DASHBOARD_VER_FINANCEIRO: "dashboard:ver_financeiro",

  // Módulo: Produção (bancadas de industrialização)
  PRODUCAO_REGISTRAR: "producao:registrar", // líder de bancada lança produção no tablet
  PRODUCAO_CORRIGIR: "producao:corrigir", // supervisor edita/corrige um registro feito errado
  PRODUCAO_GERENCIAR_CADASTRO: "producao:gerenciar_cadastro", // Admin/Coordenador ajusta bancadas, operadores, meta e U.H. referência
  PRODUCAO_VER_DASHBOARD: "producao:ver_dashboard", // ver progresso por obra e produtividade por operador

  // Módulo: Suprimentos / Estoque
  SUPRIMENTOS_REGISTRAR_ENTRADA: "suprimentos:registrar_entrada",
  SUPRIMENTOS_VER_ESTOQUE: "suprimentos:ver_estoque",
  SUPRIMENTOS_LIBERAR_PRODUCAO: "suprimentos:liberar_producao",

  EXPEDICAO_CRIAR_REMESSA: "expedicao:criar_remessa",
  EXPEDICAO_GERENCIAR_SEPARACAO: "expedicao:gerenciar_separacao",
  EXPEDICAO_GERENCIAR_CONFERENCIA: "expedicao:gerenciar_conferencia",
  EXPEDICAO_GERENCIAR_VOLUMES: "expedicao:gerenciar_volumes",
  EXPEDICAO_GERENCIAR_CARREGAMENTO: "expedicao:gerenciar_carregamento",
  EXPEDICAO_LIBERAR_CARREGAMENTO: "expedicao:liberar_carregamento",
  EXPEDICAO_REGISTRAR_SAIDA: "expedicao:registrar_saida",
  EXPEDICAO_CANCELAR: "expedicao:cancelar",
  EXPEDICAO_GERENCIAR_CADASTROS: "expedicao:gerenciar_cadastros", // Transportadora/Motorista/Veículo
  DASHBOARD_VER_SUPRIMENTOS: "dashboard:ver_suprimentos",
} as const;

export type PermissaoChave = (typeof PERMISSOES)[keyof typeof PERMISSOES];

/**
 * Descrições legíveis exibidas na tela de gestão de Papéis (Admin), para
 * cada chave acima. Mantidas junto da declaração para não desincronizar.
 */
export const DESCRICOES_PERMISSOES: Record<PermissaoChave, string> = {
  [PERMISSOES.ADMIN_GERENCIAR_USUARIOS]: "Criar, editar e desativar usuários",
  [PERMISSOES.ADMIN_GERENCIAR_PAPEIS]: "Criar papéis e definir suas permissões",
  [PERMISSOES.ADMIN_GERENCIAR_PRECOS]: "Editar a tabela de preço base e os multiplicadores de Tier",
  [PERMISSOES.CLIENTE_VER]: "Visualizar construtoras cadastradas",
  [PERMISSOES.CLIENTE_CRIAR]: "Cadastrar novas construtoras",
  [PERMISSOES.CLIENTE_EDITAR]: "Editar dados de construtoras existentes",
  [PERMISSOES.CLIENTE_ATIVAR_INATIVAR]: "Ativar e inativar construtoras (restrito a Admin e Diretor)",
  [PERMISSOES.CLIENTE_DEFINIR_TIER]: "Definir o Tier de precificação do cliente (restrito a Admin e Diretor)",
  [PERMISSOES.EMPREENDIMENTO_CRIAR]: "Cadastrar novos empreendimentos",
  [PERMISSOES.EMPREENDIMENTO_EDITAR]: "Editar empreendimentos existentes",
  [PERMISSOES.EMPREENDIMENTO_VER]: "Visualizar empreendimentos",
  [PERMISSOES.EMPREENDIMENTO_EXCLUIR]: "Excluir empreendimentos",
  [PERMISSOES.EMPREENDIMENTO_ANOTAR]: "Adicionar anotações na timeline do empreendimento",
  [PERMISSOES.EMPREENDIMENTO_LEVANTAMENTO]: "Acessar e editar levantamento elétrico do empreendimento",
  [PERMISSOES.EMPREENDIMENTO_DEFINIR_TIER]: "Ajustar o Tier de precificação do empreendimento (restrito a Admin e Diretor)",
  [PERMISSOES.RESPONSABILIDADE_COMERCIAL]: "Assumir/concluir a etapa Comercial de um empreendimento",
  [PERMISSOES.RESPONSABILIDADE_ENGENHARIA]: "Assumir/concluir a etapa de Engenharia de um empreendimento",
  [PERMISSOES.RESPONSABILIDADE_ORCAMENTACAO]: "Assumir/concluir a etapa de Orçamentação de um empreendimento",
  [PERMISSOES.EMPREENDIMENTO_APROVAR_PROPOSTA]: "Dar aval para gerar a proposta comercial (restrito a Diretor e Coordenador)",
  [PERMISSOES.ORCAMENTO_APROVAR]: "Aprovar ou devolver um orçamento enviado para aprovação",
  [PERMISSOES.ORCAMENTO_GERENCIAR_JORNADA]: "Atribuir responsável, prazo e gerenciar etapas do orçamento",
  [PERMISSOES.FORNECEDOR_VER]: "Visualizar fornecedores cadastrados",
  [PERMISSOES.FORNECEDOR_CRIAR]: "Cadastrar novos fornecedores",
  [PERMISSOES.FORNECEDOR_EDITAR]: "Editar dados de fornecedores existentes",
  [PERMISSOES.FORNECEDOR_ATIVAR_INATIVAR]: "Ativar e inativar fornecedores",
  [PERMISSOES.FINANCEIRO_VER]: "Visualizar dados financeiros (contas a pagar, dashboard)",
  [PERMISSOES.FINANCEIRO_GERENCIAR_CADASTROS]: "Gerenciar Empresas do Grupo e Categorias de Despesa",
  [PERMISSOES.FINANCEIRO_LANCAR_CONTA]: "Criar e editar contas a pagar",
  [PERMISSOES.FINANCEIRO_BAIXAR_CONTA]: "Marcar contas a pagar como pagas",
  [PERMISSOES.FINANCEIRO_EXCLUIR_CONTA]: "Excluir lançamentos de contas a pagar",
  [PERMISSOES.SEGURANCA_VER_LOG]: "Ver o log de segurança (tentativas de login, permissões negadas)",
  [PERMISSOES.DASHBOARD_VER_DIRETORIA]: "Ver a aba Diretoria do Analytics",
  [PERMISSOES.DASHBOARD_VER_COORDENACAO]: "Ver a aba Coordenação do Analytics",
  [PERMISSOES.DASHBOARD_VER_COMERCIAL]: "Ver a aba Comercial do Analytics",
  [PERMISSOES.DASHBOARD_VER_ENGENHARIA]: "Ver a aba Engenharia do Analytics",
  [PERMISSOES.DASHBOARD_VER_ORCAMENTACAO]: "Ver a aba Orçamentação do Analytics",
  [PERMISSOES.DASHBOARD_VER_FINANCEIRO]: "Ver a aba Financeiro do Analytics",
  [PERMISSOES.PRODUCAO_REGISTRAR]: "Lançar produção no tablet de uma bancada",
  [PERMISSOES.PRODUCAO_CORRIGIR]: "Corrigir um registro de produção lançado errado",
  [PERMISSOES.PRODUCAO_GERENCIAR_CADASTRO]: "Ajustar bancadas, operadores, meta diária e U.H. Referência",
  [PERMISSOES.PRODUCAO_VER_DASHBOARD]: "Ver o progresso de produção por obra e por operador",
  [PERMISSOES.SUPRIMENTOS_REGISTRAR_ENTRADA]: "Registrar entrada de material recebido no estoque",
  [PERMISSOES.SUPRIMENTOS_VER_ESTOQUE]: "Ver saldo e movimentações de estoque",
  [PERMISSOES.SUPRIMENTOS_LIBERAR_PRODUCAO]: "Liberar o início de produção de uma tipologia (baixa automática de material)",

  [PERMISSOES.EXPEDICAO_CRIAR_REMESSA]: "Criar novas remessas de expedição",
  [PERMISSOES.EXPEDICAO_GERENCIAR_SEPARACAO]: "Registrar quantidades separadas e finalizar separação",
  [PERMISSOES.EXPEDICAO_GERENCIAR_CONFERENCIA]: "Registrar quantidades conferidas e finalizar conferência",
  [PERMISSOES.EXPEDICAO_GERENCIAR_VOLUMES]: "Criar volumes e vincular itens a eles",
  [PERMISSOES.EXPEDICAO_GERENCIAR_CARREGAMENTO]: "Criar carregamentos e vincular volumes",
  [PERMISSOES.EXPEDICAO_LIBERAR_CARREGAMENTO]: "Liberar um carregamento pra saída",
  [PERMISSOES.EXPEDICAO_REGISTRAR_SAIDA]: "Registrar a saída física de um carregamento",
  [PERMISSOES.EXPEDICAO_CANCELAR]: "Cancelar remessas, volumes ou carregamentos",
  [PERMISSOES.EXPEDICAO_GERENCIAR_CADASTROS]: "Gerenciar cadastro de transportadoras, motoristas e veículos",
  [PERMISSOES.DASHBOARD_VER_SUPRIMENTOS]: "Ver a aba Suprimentos do Analytics",
};

/**
 * Verifica se a lista de permissões de um usuário (já achatada a partir
 * de todos os seus papéis) contém a permissão exigida.
 */
export function hasPermission(
  permissoesDoUsuario: string[],
  permissaoExigida: PermissaoChave
): boolean {
  return permissoesDoUsuario.includes(permissaoExigida);
}
