export type TipoEvento = "MUDANCA_STATUS" | "ANOTACAO" | "DOCUMENTO";

export interface EventoEmpreendimento {
  id: string;
  empreendimentoId: string;
  tipo: TipoEvento;
  titulo: string;
  descricao?: string | null;
  usuarioId?: string | null;
  usuarioNome?: string | null;
  meta?: string | null;
  createdAt: Date;
}

export interface DocumentoEmpreendimento {
  id: string;
  empreendimentoId: string;
  nome: string;
  url: string;
  tamanho?: number | null;
  tipo?: string | null;
  usuarioId?: string | null;
  createdAt: Date;
}
