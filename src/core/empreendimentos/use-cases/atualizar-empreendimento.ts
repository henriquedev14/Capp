import type { EmpreendimentoRepository } from "@/core/empreendimentos/repositories/empreendimento-repository";
import type { ClienteRepository } from "@/core/clientes/repositories/cliente-repository";
import type { EstruturaFisicaRepository } from "@/core/empreendimentos/repositories/estrutura-fisica-repository";
import type { Empreendimento } from "@/core/empreendimentos/entities/empreendimento";
import type { TorreInput, TipologiaInput } from "@/core/empreendimentos/entities/estrutura-fisica";

export type AtualizarEmpreendimentoInput = Partial<
  Omit<Empreendimento, "id" | "codigo" | "createdAt" | "updatedAt" | "valorEstimado">
> & {
  // Quando fornecidos (não undefined), SUBSTITUEM integralmente a
  // estrutura física / tipologias existentes do empreendimento — veja
  // EstruturaFisicaRepository.substituirEstrutura para o racional dessa
  // abordagem "substitutiva" em vez de diff incremental.
  torres?: TorreInput[];
  tipologias?: TipologiaInput[];
};

export class AtualizarEmpreendimentoUseCase {
  constructor(
    private readonly empreendimentoRepo: EmpreendimentoRepository,
    private readonly clienteRepo: ClienteRepository,
    private readonly estruturaFisicaRepo: EstruturaFisicaRepository
  ) {}

  async executar(id: string, input: AtualizarEmpreendimentoInput): Promise<Empreendimento> {
    const existente = await this.empreendimentoRepo.findById(id);
    if (!existente) {
      throw new Error("Empreendimento não encontrado.");
    }

    // Se o cliente está sendo trocado, valida que o novo cliente existe e
    // está ativo — mesma regra da criação.
    if (input.clienteId && input.clienteId !== existente.clienteId) {
      const cliente = await this.clienteRepo.findById(input.clienteId);
      if (!cliente) {
        throw new Error("Cliente (construtora) não encontrado.");
      }
      if (!cliente.ativo) {
        throw new Error("Não é possível vincular a uma construtora inativa.");
      }
    }

    if (input.torres) {
      for (const torre of input.torres) {
        if (torre.pavimentos < 1) {
          throw new Error(`A torre "${torre.nome}" precisa ter pelo menos 1 pavimento.`);
        }
        if (torre.unidadesPorPavimento < 1) {
          throw new Error(`A torre "${torre.nome}" precisa ter pelo menos 1 unidade por pavimento.`);
        }
      }
    }

    const { torres, tipologias, ...dadosEmpreendimento } = input;

    const empreendimentoAtualizado = await this.empreendimentoRepo.update(id, dadosEmpreendimento);

    if (torres) {
      await this.estruturaFisicaRepo.substituirEstrutura(id, torres);
    }
    if (tipologias) {
      await this.estruturaFisicaRepo.substituirTipologias(id, tipologias);
    }

    // Sincroniza a Tipologia sintética "Hall" sempre que as torres forem
    // reenviadas (o formulário sempre reenvia a estrutura completa) —
    // usa o valor mais recente de temHall/hallTipo, com fallback para o
    // que já estava salvo caso o formulário não tenha alterado esses campos.
    if (torres) {
      const temHall = dadosEmpreendimento.temHall ?? existente.temHall;
      const hallTipo = dadosEmpreendimento.hallTipo ?? existente.hallTipo;
      const hallQuantidadeEspecifica =
        dadosEmpreendimento.hallQuantidadeEspecifica ?? existente.hallQuantidadeEspecifica;

      const quantidadeHallResolvida =
        hallTipo === "ESPECIFICO"
          ? hallQuantidadeEspecifica ?? 1
          : torres.reduce((acc, t) => acc + t.pavimentos, 0);

      await this.estruturaFisicaRepo.sincronizarTipologiaHall(id, temHall, quantidadeHallResolvida);
    }

    return empreendimentoAtualizado;
  }
}
