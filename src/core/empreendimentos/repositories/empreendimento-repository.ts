import type { Empreendimento, StatusEmpreendimento } from "@/core/empreendimentos/entities/empreendimento";

/** Versão resumida usada na listagem — já com o nome do cliente resolvido */
export interface EmpreendimentoResumo {
  id: string;
  codigo: string;
  nome: string;
  clienteNome: string;
  cidade: string;
  estado: string;
  status: StatusEmpreendimento;
  tipo: Empreendimento["tipo"];
  updatedAt: Date;
}

export interface EmpreendimentoFiltros {
  busca?: string;
  status?: StatusEmpreendimento;
  clienteId?: string;
}

/**
 * Contrato que qualquer implementação de persistência de Empreendimento
 * deve seguir. O `core/` conhece apenas esta interface — nunca a
 * implementação real (Prisma, outro ORM, um mock em memória para testes).
 *
 * Isso é o Dependency Inversion Principle (SOLID) na prática: quem decide
 * "como" os dados são salvos é a camada de infraestrutura (infra/), nunca
 * a camada de negócio.
 */
export interface EmpreendimentoRepository {
  findById(id: string): Promise<Empreendimento | null>;
  /** [CORREÇÃO C2/C3.1] Busca incluindo arquivados — usado pela página de detalhe, que permite consulta somente leitura de arquivados. */
  findByIdIncluindoExcluidos(id: string): Promise<Empreendimento | null>;
  findMany(): Promise<Empreendimento[]>;
  findManyResumo(filtros?: EmpreendimentoFiltros): Promise<EmpreendimentoResumo[]>;
  create(data: Omit<Empreendimento, "id" | "codigo" | "createdAt" | "updatedAt">): Promise<Empreendimento>;
  update(
    id: string,
    data: Partial<Omit<Empreendimento, "id" | "codigo" | "createdAt" | "updatedAt">>
  ): Promise<Empreendimento>;
  /**
   * [CORREÇÃO C2/C3.1] Substitui o antigo delete() físico — soft-delete
   * idempotente. Arquivar um já arquivado não altera excluidoEm/excluidoPorId
   * originais, não duplica evento de timeline, e retorna o registro atual.
   */
  arquivar(id: string, usuarioId: string): Promise<Empreendimento>;
  /** Idempotente — restaurar um já ativo não altera nada nem duplica evento. */
  restaurar(id: string, usuarioId: string): Promise<Empreendimento>;
}
