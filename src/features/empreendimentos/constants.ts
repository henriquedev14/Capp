import type { PersonOption } from "@/components/form/person-form-field";

/**
 * Opções estáticas utilizadas apenas para validar a interface.
 * Quando a integração com o backend (Prisma/Supabase) existir,
 * estes arrays serão substituídos por dados vindos da API.
 */

export const ESTADOS_BR = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MG", label: "Minas Gerais" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MT", label: "Mato Grosso" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "PR", label: "Paraná" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RO", label: "Rondônia" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SE", label: "Sergipe" },
  { value: "SP", label: "São Paulo" },
  { value: "TO", label: "Tocantins" },
];

// Os "value" abaixo são EXATAMENTE os valores do enum TipoEmpreendimento no
// schema.prisma — não são apenas rótulos de UI. Mudar aqui sem mudar lá (ou
// vice-versa) quebra a gravação no banco.
// Os "value" abaixo são EXATAMENTE os valores do enum TipoEmpreendimento no
// schema.prisma — não são apenas rótulos de UI. Mudar aqui sem mudar lá (ou
// vice-versa) quebra a gravação no banco.
export const TIPOS_EMPREENDIMENTO = [
  { value: "RESIDENCIAL_VERTICAL", label: "Residencial Vertical" },
  { value: "RESIDENCIAL_HORIZONTAL", label: "Residencial Horizontal" },
  { value: "COMERCIAL", label: "Comercial" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "INFRAESTRUTURA", label: "Infraestrutura" },
  { value: "LOTEAMENTO", label: "Loteamento" },
];

/** Tipos de estrutura — values exatos do enum TipoEstrutura no schema.prisma. */
export const TIPOS_ESTRUTURA = [
  { value: "CONCRETO_ARMADO", label: "Concreto armado" },
  { value: "ALVENARIA_ESTRUTURAL", label: "Alvenaria estrutural" },
  { value: "PAREDE_DE_CONCRETO", label: "Parede de concreto" },
  { value: "ESTRUTURA_METALICA", label: "Estrutura metálica" },
  { value: "STEEL_FRAME", label: "Steel frame" },
  { value: "WOOD_FRAME", label: "Wood frame" },
];

export type StatusGrupo = "prospeccao" | "comercial" | "execucao" | "concluido" | "arquivado";

export interface StatusOption {
  value: string;
  label: string;
  grupo: StatusGrupo;
  descricao: string;
  proximos: string[];
}

export const STATUS_EMPREENDIMENTO: StatusOption[] = [
  {
    value: "PROSPECCAO",
    label: "Prospecção",
    grupo: "prospeccao",
    descricao: "Empreendimento cadastrado, aguardando desenvolvimento comercial.",
    proximos: ["COMERCIAL"],
  },
  {
    value: "COMERCIAL",
    label: "Comercial",
    grupo: "comercial",
    descricao: "Em negociação — levantamento técnico em andamento e aprovação inicial do cliente.",
    proximos: ["ORCAMENTACAO", "ARQUIVADO"],
  },
  {
    value: "ORCAMENTACAO",
    label: "Orçamentação",
    grupo: "comercial",
    descricao: "Levantamento validado — montagem da proposta de materiais e serviço HGI.",
    proximos: ["NEGOCIACAO", "ARQUIVADO"],
  },
  {
    value: "NEGOCIACAO",
    label: "Negociação",
    grupo: "comercial",
    descricao:
      "Proposta pronta, em negociação com o cliente. Preços do orçamento ainda podem ser ajustados a pedido do cliente.",
    proximos: ["CONTRATADO", "ORCAMENTACAO", "ARQUIVADO"],
  },
  {
    value: "CONTRATADO",
    label: "Contratado",
    grupo: "execucao",
    descricao: "Proposta aprovada, contratos assinados.",
    proximos: ["SUPRIMENTOS"],
  },
  {
    value: "SUPRIMENTOS",
    label: "Suprimentos",
    grupo: "execucao",
    descricao: "Materiais sendo adquiridos — aguardando fornecedor e entrada em estoque.",
    proximos: ["PRODUCAO"],
  },
  {
    value: "PRODUCAO",
    label: "Produção",
    grupo: "execucao",
    descricao: "Kits sendo fabricados na fábrica HGI — inclui validação e remessas.",
    proximos: ["CONCLUIDO"],
  },
  {
    value: "CONCLUIDO",
    label: "Concluído",
    grupo: "concluido",
    descricao: "Instalação finalizada e validada pela equipe HGI no local.",
    proximos: [],
  },
  {
    value: "ARQUIVADO",
    label: "Arquivado",
    grupo: "arquivado",
    descricao: "Proposta reprovada ou projeto cancelado. Histórico preservado.",
    proximos: ["PROSPECCAO"],
  },
];

export function getStatusOption(value: string): StatusOption | undefined {
  return STATUS_EMPREENDIMENTO.find((s) => s.value === value);
}

export const STATUS_OPORTUNIDADE = STATUS_EMPREENDIMENTO.map(({ value, label }) => ({
  value,
  label,
}));

// EQUIPE_COMERCIAL / EQUIPE_ENGENHARIA / EQUIPE_ORCAMENTACAO foram removidas
// daqui: eram dados mockados usados só para validar a interface antes do
// Módulo 2 (Autenticação) existir. Agora que existe uma tabela real de
// Usuario, a lista de responsáveis vem do banco — veja
// src/app/(main)/empreendimentos/novo/page.tsx, que busca os usuários
// ativos e passa como prop para o formulário.
