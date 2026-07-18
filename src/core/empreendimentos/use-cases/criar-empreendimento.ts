import type { EmpreendimentoRepository } from "@/core/empreendimentos/repositories/empreendimento-repository";
import type { ClienteRepository } from "@/core/clientes/repositories/cliente-repository";
import type { EstruturaFisicaRepository } from "@/core/empreendimentos/repositories/estrutura-fisica-repository";
import type { Empreendimento } from "@/core/empreendimentos/entities/empreendimento";
import type { TorreInput, TipologiaInput } from "@/core/empreendimentos/entities/estrutura-fisica";

export interface CriarEmpreendimentoInput {
  nome: string;
  clienteId: string;
  cidade: string;
  estado: string;
  endereco: string;
  tipo: Empreendimento["tipo"];
  construtora: string;
  incorporadora?: string | null;
  tipoEstrutura?: Empreendimento["tipoEstrutura"];
  kitEletrico: boolean;
  kitHidraulico: boolean;
  kitQdc: boolean;
  tiposInstalacao: string[];
  responsavelComercial: string;
  // Tier explícito do formulário. Se null/undefined, herda o tier do cliente.
  tier?: number | null;
  criterioPrecificacao?: "AREA" | "PONTOS_TETO" | null;
  dataPrevistaInicio?: Date | null;
  dataPrevistaEntrega?: Date | null;
  responsavelComercialUserId?: string | null;
  responsavelEngenhariaUserId?: string | null;
  responsavelOrcamentacaoUserId?: string | null;
  observacoes?: string | null;
  temHall: boolean;
  hallTipo?: "TODOS" | "ESPECIFICO" | null;
  hallQuantidadeEspecifica?: number | null;
  torres: TorreInput[];
  tipologias: TipologiaInput[];
}

export class CriarEmpreendimentoUseCase {
  constructor(
    private readonly empreendimentoRepo: EmpreendimentoRepository,
    private readonly clienteRepo: ClienteRepository,
    private readonly estruturaFisicaRepo: EstruturaFisicaRepository
  ) {}

  async executar(input: CriarEmpreendimentoInput): Promise<Empreendimento> {
    // Regra: o cliente precisa existir e estar ativo. Empreendimento é
    // sempre criado a partir de um cliente já cadastrado (Módulo 3) — não
    // há criação inline, por decisão de processo.
    const cliente = await this.clienteRepo.findById(input.clienteId);
    if (!cliente) {
      throw new Error("Cliente (construtora) não encontrado.");
    }
    if (!cliente.ativo) {
      throw new Error("Não é possível criar um empreendimento para uma construtora inativa.");
    }

    // Regra: cada Torre precisa de pelo menos 1 pavimento e 1 unidade por
    // pavimento — números zero ou negativos não fazem sentido de negócio
    // e quebrariam silenciosamente a geração da estrutura física.
    for (const torre of input.torres) {
      if (torre.pavimentos < 1) {
        throw new Error(`A torre "${torre.nome}" precisa ter pelo menos 1 pavimento.`);
      }
      if (torre.unidadesPorPavimento < 1) {
        throw new Error(`A torre "${torre.nome}" precisa ter pelo menos 1 unidade por pavimento.`);
      }
    }

    // Regra: todo empreendimento nasce em status "Prospecção" — é a
    // primeira etapa do funil comercial. O valor do empreendimento ainda
    // não existe nesta etapa (só passa a existir após o Levantamento
    // Quantitativo e a Orçamentação, Módulos 7/8).
    const empreendimento = await this.empreendimentoRepo.create({
      nome: input.nome,
      clienteId: input.clienteId,
      cidade: input.cidade,
      estado: input.estado,
      endereco: input.endereco,
      tipo: input.tipo,
      construtora: input.construtora,
      incorporadora: input.incorporadora,
      tipoEstrutura: input.tipoEstrutura ?? null,
      metodoConstrutivo: null,
      tipoLaje: null,
      tipoVedacao: null,
      responsavelComercial: input.responsavelComercial,
      status: "PROSPECCAO",
      // Regra: o tier do empreendimento nasce herdado do tier do cliente,
      // a menos que tenha sido ajustado explicitamente no cadastro —
      // "o tier é do cliente, mas ajustável por empreendimento".
      tier: input.tier ?? cliente.tier ?? null,
      criterioPrecificacao: input.criterioPrecificacao ?? null,
      valorEstimado: null,
      dataPrevistaInicio: input.dataPrevistaInicio ?? null,
      dataPrevistaEntrega: input.dataPrevistaEntrega ?? null,
      responsavelComercialUserId: input.responsavelComercialUserId ?? null,
      responsavelEngenhariaUserId: input.responsavelEngenhariaUserId ?? null,
      responsavelOrcamentacaoUserId: input.responsavelOrcamentacaoUserId ?? null,
      observacoes: input.observacoes ?? null,
      temHall: input.temHall,
      hallTipo: input.hallTipo ?? null,
      hallQuantidadeEspecifica: input.hallQuantidadeEspecifica ?? null,
      kitEletrico: input.kitEletrico,
      kitHidraulico: input.kitHidraulico,
      kitQdc: input.kitQdc,
      tiposInstalacao: input.tiposInstalacao,
    });

    // Gera a estrutura física (Torre -> Pavimento -> Unidade) e o
    // catálogo de Tipologias a partir dos números informados no cadastro.
    // Roda depois do Empreendimento já existir, pois ambos dependem do
    // empreendimentoId recém-gerado.
    await this.estruturaFisicaRepo.substituirEstrutura(empreendimento.id, input.torres);
    await this.estruturaFisicaRepo.substituirTipologias(empreendimento.id, input.tipologias);

    // Sincroniza a Tipologia sintética "Hall" — resolvida automaticamente
    // (soma dos pavimentos de todas as torres, ou quantidade específica
    // digitada), nunca cadastrada manualmente pelo usuário.
    const quantidadeHallResolvida =
      input.hallTipo === "ESPECIFICO"
        ? input.hallQuantidadeEspecifica ?? 1
        : input.torres.reduce((acc, t) => acc + t.pavimentos, 0);
    await this.estruturaFisicaRepo.sincronizarTipologiaHall(
      empreendimento.id,
      input.temHall,
      quantidadeHallResolvida
    );

    return empreendimento;
  }
}
