import type { CircuitoCatalogo } from "@/core/empreendimentos/entities/levantamento-eletrico";

/**
 * Catálogo padrão de circuitos — baseado na aba CIRCUITOS da planilha HGI.
 * Criado automaticamente ao iniciar um levantamento, podendo ser
 * customizado por empreendimento conforme o projeto elétrico específico.
 */
export const CIRCUITOS_PADRAO: Omit<
  CircuitoCatalogo,
  "id" | "empreendimentoId" | "createdAt" | "updatedAt"
>[] = [
  {
    numero: 1,
    descricao: "Iluminação",
    bitola: 1.5,
    temVermelho: true,
    temPreto: false,
    temAzul: true,
    temVerde: true,
    temAmarelo: false,
    temBranco: false,
    temCinza: false,
  },
  {
    numero: 2,
    descricao: "TUG",
    bitola: 2.5,
    temVermelho: false,
    temPreto: true,
    temAzul: true,
    temVerde: true,
    temAmarelo: false,
    temBranco: false,
    temCinza: false,
  },
  {
    numero: 3,
    descricao: "Chuveiro",
    bitola: 6,
    temVermelho: true,
    temPreto: true,
    temAzul: false,
    temVerde: true,
    temAmarelo: false,
    temBranco: false,
    temCinza: false,
  },
  {
    numero: 4,
    descricao: "Interruptor",
    bitola: 1.5,
    temVermelho: true,
    temPreto: false,
    temAzul: false,
    temVerde: false,
    temAmarelo: false,
    temBranco: true,
    temCinza: false,
  },
  {
    numero: 5,
    descricao: "Paralelo",
    bitola: 1.5,
    temVermelho: true,
    temPreto: false,
    temAzul: false,
    temVerde: false,
    temAmarelo: false,
    temBranco: false,
    temCinza: false,
  },
  {
    numero: 6,
    descricao: "TUE — Tomada de uso específico",
    bitola: 2.5,
    temVermelho: true,
    temPreto: true,
    temAzul: false,
    temVerde: true,
    temAmarelo: false,
    temBranco: false,
    temCinza: false,
  },
];
