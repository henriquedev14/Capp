import type { EventoEmpreendimento, TipoEvento } from "@/core/empreendimentos/entities/timeline";

export interface CriarEventoInput {
  empreendimentoId: string;
  tipo: TipoEvento;
  titulo: string;
  descricao?: string | null;
  usuarioId?: string | null;
  meta?: string | null;
}

export interface TimelineRepository {
  buscarEventos(empreendimentoId: string): Promise<EventoEmpreendimento[]>;
  criarEvento(input: CriarEventoInput): Promise<EventoEmpreendimento>;
}
