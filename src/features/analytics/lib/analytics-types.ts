export type ConfiabilidadeMetrica = "CONFIAVEL" | "APROXIMADA" | "INDISPONIVEL";

export interface EtapaPipelineAnalytics {
  status: string;
  label: string;
  quantidade: number;
  valor: number;
  agingMedioDias: number | null;
  foraSla: number;
}

export interface RiscoAnalytics {
  id: string;
  empreendimentoId: string | null;
  empreendimentoNome: string;
  area: "COMERCIAL" | "ENGENHARIA" | "ORCAMENTACAO" | "NEGOCIACAO" | "SUPRIMENTOS" | "PRODUCAO" | "EXPEDICAO" | "FINANCEIRO";
  severidade: "ALTA" | "MEDIA" | "BAIXA";
  titulo: string;
  detalhe: string;
  dias: number | null;
  responsavel: string | null;
  href: string;
}

export interface EngenhariaPessoaAnalytics {
  usuarioId: string;
  nome: string;
  disciplina: "ELETRICA" | "HIDRAULICA" | "MATERIAIS";
  wip: number;
  backlogPontos: number;
  entreguePontos: number;
  pacotesEntregues: number;
  leadTimeMedioDias: number | null;
  noPrazoPct: number | null;
  qualidadePct: number | null;
  qualidadeAmostras: number;
  qualidadeConfiabilidade: ConfiabilidadeMetrica;
  retrabalhosObservados: number;
  bloqueadoHoras: number | null;
  pacotesBloqueados: number;
}

export interface EngenhariaPacoteAnalytics {
  id: string;
  empreendimentoId: string;
  empreendimentoNome: string;
  tipologia: string;
  disciplina: "ELETRICA" | "HIDRAULICA" | "MATERIAIS";
  escopo: string;
  executorId: string | null;
  executorNome: string;
  validadorNome: string | null;
  status: string;
  complexidade: number;
  complexidadeNivel: "MUITO_SIMPLES" | "SIMPLES" | "MODERADA" | "COMPLEXA" | "MUITO_COMPLEXA";
  criadoEm: Date;
  atualizadoEm: Date;
  validadoEm: Date | null;
  leadTimeDiasUteis: number;
  dentroSla: boolean | null;
  prazo: Date | null;
  bloqueado: boolean;
  motivoBloqueio: string | null;
  bloqueadoHoras: number;
  retrabalhosObservados: number;
  instrumentadoEm: Date | null;
}

export interface AnalyticsData {
  geradoEm: Date;
  carteira: {
    ativos: number;
    legadosAtivos: number;
    valorCarteira: number;
    valorEmNegociacao: number;
    valorContratado: number;
    valorEmProducao: number;
    clientesAtivos: number;
  };
  pipeline: EtapaPipelineAnalytics[];
  comercial: {
    ganhos30d: number;
    valorGanho30d: number;
    perdidos30d: number;
    valorPerdido30d: number;
    taxaConversao30d: number | null;
  };
  engenharia: {
    backlog: number;
    validados30d: number;
    foraSla: number;
    complexidadeBacklog: number;
    leadTimeMedioDias: number | null;
    amostrasLeadTime: number;
    porPessoa: EngenhariaPessoaAnalytics[];
    pacotesAbertos: EngenhariaPacoteAnalytics[];
    pacotesCriticos: EngenhariaPacoteAnalytics[];
    executoresDisponiveis: { id: string; nome: string }[];
    bloqueados: number;
    retrabalhosObservados30d: number;
    firstPassYieldPct: number | null;
    firstPassYieldAmostras: number;
    capacidadePorDisciplina: {
      disciplina: "ELETRICA" | "HIDRAULICA" | "MATERIAIS";
      capacidadeObservada30dPontos: number;
      backlogAtualPontos: number;
      coberturaBacklogMeses: number | null;
      pacotesEntregues30d: number;
    }[];
    instrumentacaoTempoAtivoDisponivel: boolean;
  };
  orcamentacao: {
    emElaboracao: number;
    aguardandoGestor: number;
    devolvidos30d: number;
    aprovados30d: number;
    valorAguardandoGestor: number;
    tempoMedioFilaGestorDias: number | null;
  };
  negociacao: {
    abertas: number;
    valorAberto: number;
    followupsVencidos: number;
    semInteracao7d: number;
    descontoMedioPct: number | null;
    motivosPerda: { motivo: string; quantidade: number; valor: number }[];
  };
  suprimentos: {
    cotacoesSemResposta: number;
    pedidosAbertos: number;
    pedidosAtrasados: number;
    valorPedidosAbertos: number;
    itensPendentesRecebimento: number;
    tempoMedioMaterialAteProducaoDias: number | null;
  };
  producao: {
    ordensPendentes: number;
    ordensEmAndamento: number;
    ordensPausadas: number;
    ordensAtrasadas: number;
    uh30d: number;
    retrabalho: number;
    perdas: number;
    tempoParadoHoras30d: number;
    motivosParada: { motivo: string; horas: number }[];
    legadoContratado: number;
    legadoProduzidoHistorico: number;
    legadoProduzidoErp: number;
    legadoEntregueHistorico: number;
    legadoEntregueErp: number;
  };
  expedicao: {
    remessasAbertas: number;
    remessasParciais: number;
    remessasAtrasadas: number;
    quantidadePrevista: number;
    quantidadeSeparada: number;
    quantidadeConferida: number;
    quantidadeCarregada: number;
    quantidadeExpedida: number;
    gapProduzidoExpedido: number | null;
  };
  financeiro: {
    valorContratado: number;
    faturadoHistoricoLegado: number;
    titulosGerados: number;
    recebido: number;
    recebidoHistoricoLegado: number;
    emAberto: number;
    vencido: number;
    vencidosQuantidade: number;
    aging: { faixa: string; valor: number; quantidade: number }[];
    confiabilidadeFaturadoPosErp: ConfiabilidadeMetrica;
  };
  riscos: RiscoAnalytics[];
  coordenacao: {
    criticos: number;
    foraSla: number;
    bloqueios: number;
    fila: RiscoAnalytics[];
  };
}
