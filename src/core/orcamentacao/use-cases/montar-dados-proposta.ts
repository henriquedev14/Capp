import { TIPOS_ESTRUTURA } from "@/features/empreendimentos/constants";
import type { AnexoMateriaisProposta } from "@/features/orcamentacao/lib/proposta-anexo-materiais";
import type { PropostaInstitucionalData } from "@/features/orcamentacao/lib/renderizar-proposta";

const NAO_INFORMADO = "Não informado";

export interface DadosParaMontarProposta {
  empreendimentoCodigo: string;
  empreendimentoNome: string;
  empreendimentoCidade: string;
  empreendimentoEstado: string;
  empreendimentoTipoEstrutura: string | null;
  revisao: number;
  cliente: {
    nomeFantasia: string | null;
    razaoSocial: string;
    cnpj: string | null;
    logradouro: string | null;
    cidade: string | null;
    estado: string | null;
  };
  totalUnidadesHabitacionais: number;
  usuario: { nome: string | null; cargo: string | null; email: string | null; telefone: string | null } | null;
  totalMaoDeObra: number;
  anexoMateriais: AnexoMateriaisProposta;
}

/**
 * Monta o objeto de dados que alimenta o template da Proposta Comercial —
 * formatação de endereço, rótulo do sistema construtivo, valores por
 * unidade habitacional. Função pura — extraída de renderizar-proposta.tsx
 * na Tarefa 2.1.4 (PropostaService). Quem chama já buscou todos os dados
 * nos repositórios; essa função só decide COMO exibi-los.
 */
export function montarDadosProposta(input: DadosParaMontarProposta): PropostaInstitucionalData {
  const unidadesHabitacionais = input.totalUnidadesHabitacionais || null;

  const sistemaConstrutivo = input.empreendimentoTipoEstrutura
    ? TIPOS_ESTRUTURA.find((t) => t.value === input.empreendimentoTipoEstrutura)?.label ??
      input.empreendimentoTipoEstrutura
    : NAO_INFORMADO;

  const enderecoCliente =
    [
      input.cliente.logradouro,
      input.cliente.cidade && input.cliente.estado ? `${input.cliente.cidade}-${input.cliente.estado}` : null,
    ]
      .filter(Boolean)
      .join(", ") || NAO_INFORMADO;

  return {
    numeroProposta: `${input.empreendimentoCodigo}-REV${input.revisao}`,
    dataEmissao: new Date()
      .toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
      .toUpperCase(),
    cliente: {
      nome: input.cliente.nomeFantasia ?? input.cliente.razaoSocial,
      cnpj: input.cliente.cnpj || NAO_INFORMADO,
      endereco: enderecoCliente,
    },
    empreendimento: {
      nome: input.empreendimentoNome,
      cidade: input.empreendimentoCidade,
      estado: input.empreendimentoEstado,
      unidadesHabitacionais,
      sistemaConstrutivo,
    },
    associado: {
      nome: input.usuario?.nome ?? NAO_INFORMADO,
      cargo: input.usuario?.cargo ?? NAO_INFORMADO,
      email: input.usuario?.email ?? NAO_INFORMADO,
      telefone: input.usuario?.telefone ?? NAO_INFORMADO,
    },
    investimento: {
      maoDeObraTotal: input.totalMaoDeObra,
      maoDeObraUnitario: unidadesHabitacionais ? input.totalMaoDeObra / unidadesHabitacionais : null,
      materiaisTotal: input.anexoMateriais.totalGeral,
      materiaisUnitario: unidadesHabitacionais ? input.anexoMateriais.totalGeral / unidadesHabitacionais : null,
    },
    anexoMateriais: input.anexoMateriais,
    validadeProposta: "8 (oito) meses, contados da data de finalização",
    fretePor: "FOB — pagamento do frete pela construtora, sem desconto da ConstruApp",
  };
}
