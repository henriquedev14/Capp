import { prisma } from "@/infra/db/prisma/client";
import { OrcamentacaoPrismaRepository } from "@/infra/db/prisma/repositories/orcamentacao-prisma-repository";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { ClientePrismaRepository } from "@/infra/db/prisma/repositories/cliente-prisma-repository";
import { EstruturaFisicaPrismaRepository } from "@/infra/db/prisma/repositories/estrutura-fisica-prisma-repository";
import { LevantamentoMateriaisPrismaRepository } from "@/infra/db/prisma/repositories/levantamento-materiais-prisma-repository";
import { TIPOS_ESTRUTURA } from "@/features/empreendimentos/constants";
import { montarAnexoMateriaisProposta, type AnexoMateriaisProposta } from "@/features/orcamentacao/lib/proposta-anexo-materiais";
import { montarEscopoTemplate } from "@/features/orcamentacao/lib/proposta-escopo-adapter";
import { renderTemplateHtml } from "@/features/orcamentacao/lib/motor-template-html";
import { carregarTemplateBase, renderizarHtmlParaPdf } from "@/features/orcamentacao/lib/template-proposta-runtime";

const orcamentoRepo = new OrcamentacaoPrismaRepository();
const empreendimentoRepo = new EmpreendimentoPrismaRepository();
const clienteRepo = new ClientePrismaRepository();
const estruturaRepo = new EstruturaFisicaPrismaRepository();
const levantamentoMateriaisRepo = new LevantamentoMateriaisPrismaRepository();

const NAO_INFORMADO = "Não informado";

export interface PropostaInstitucionalData {
  numeroProposta: string;
  dataEmissao: string;
  cliente: { nome: string; cnpj: string; endereco: string };
  empreendimento: {
    nome: string;
    cidade: string;
    estado: string;
    unidadesHabitacionais: number | null;
    sistemaConstrutivo: string;
  };
  associado: { nome: string; cargo: string; email: string; telefone: string };
  investimento: {
    maoDeObraTotal: number;
    maoDeObraUnitario: number | null;
    materiaisTotal: number;
    materiaisUnitario: number | null;
  };
  anexoMateriais: AnexoMateriaisProposta;
  itensInclusos?: string[];
  itensExcluidos?: string[];
  validadeProposta?: string;
  fretePor?: string;
}

function validarCamposObrigatorios(input: {
  clienteEncontrado: boolean;
  totalMaoDeObra: number;
  totalMateriais: number;
}): string | null {
  if (!input.clienteEncontrado) return "Cliente não encontrado para este empreendimento.";
  if (input.totalMaoDeObra <= 0) {
    return "Este orçamento não tem valor de mão de obra calculado — verifique o Orçamento (Bloco 1).";
  }
  if (input.totalMateriais <= 0) {
    return "Nenhum material com Levantamento de Materiais validado para este empreendimento — a proposta precisa do valor de materiais real. Faça o upload/validação do Levantamento antes de gerar.";
  }
  return null;
}

export async function renderizarPropostaPdf(
  orcamentoId: string,
  usuarioId: string
): Promise<
  | { erro: string }
  | { buffer: Buffer; nomeArquivo: string; empreendimentoId: string; empreendimentoCodigo: string; revisao: number }
> {
  const orcamento = await orcamentoRepo.buscarPorId(orcamentoId);
  if (!orcamento) return { erro: "Orçamento não encontrado." };

  const empreendimento = await empreendimentoRepo.findById(orcamento.empreendimentoId);
  if (!empreendimento) return { erro: "Empreendimento não encontrado." };

  const [cliente, tipologias, levantamentos, usuario] = await Promise.all([
    clienteRepo.findById(empreendimento.clienteId),
    estruturaRepo.buscarTipologias(empreendimento.id),
    levantamentoMateriaisRepo.buscarTodosPorEmpreendimento(empreendimento.id),
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { nome: true, email: true, cargo: true, telefone: true } }),
  ]);

  const totalMaoDeObra = orcamento.itensServico.reduce((acc, i) => acc + i.total, 0);
  const anexoMateriais = montarAnexoMateriaisProposta(levantamentos);

  const erroValidacao = validarCamposObrigatorios({
    clienteEncontrado: !!cliente,
    totalMaoDeObra,
    totalMateriais: anexoMateriais.totalGeral,
  });
  if (erroValidacao) return { erro: erroValidacao };

  const unidadesHabitacionais = tipologias.reduce((acc, t) => acc + (t.quantidadeUnidades ?? 0), 0) || null;

  const sistemaConstrutivo = empreendimento.tipoEstrutura
    ? TIPOS_ESTRUTURA.find((t) => t.value === empreendimento.tipoEstrutura)?.label ?? empreendimento.tipoEstrutura
    : NAO_INFORMADO;

  const enderecoCliente = cliente
    ? [cliente.logradouro, cliente.cidade && cliente.estado ? `${cliente.cidade}-${cliente.estado}` : null]
        .filter(Boolean)
        .join(", ") || NAO_INFORMADO
    : NAO_INFORMADO;

  const data: PropostaInstitucionalData = {
    numeroProposta: `${empreendimento.codigo}-REV${orcamento.revisao}`,
    dataEmissao: new Date()
      .toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
      .toUpperCase(),
    cliente: {
      nome: cliente!.nomeFantasia ?? cliente!.razaoSocial,
      cnpj: cliente!.cnpj || NAO_INFORMADO,
      endereco: enderecoCliente,
    },
    empreendimento: {
      nome: empreendimento.nome,
      cidade: empreendimento.cidade,
      estado: empreendimento.estado,
      unidadesHabitacionais,
      sistemaConstrutivo,
    },
    associado: {
      nome: usuario?.nome ?? "Não informado",
      cargo: usuario?.cargo ?? NAO_INFORMADO,
      email: usuario?.email ?? NAO_INFORMADO,
      telefone: usuario?.telefone ?? NAO_INFORMADO,
    },
    investimento: {
      maoDeObraTotal: totalMaoDeObra,
      maoDeObraUnitario: unidadesHabitacionais ? totalMaoDeObra / unidadesHabitacionais : null,
      materiaisTotal: anexoMateriais.totalGeral,
      materiaisUnitario: unidadesHabitacionais ? anexoMateriais.totalGeral / unidadesHabitacionais : null,
    },
    anexoMateriais,
    // Política comercial já vigente (mesma do template anterior) — não é
    // dado do orçamento, é config fixa da empresa até virar campo editável.
    validadeProposta: "8 (oito) meses, contados da data de finalização",
    fretePor: "FOB — pagamento do frete pela construtora, sem desconto da ConstruApp",
  };

  const escopoTemplate = montarEscopoTemplate(data);
  const templateBase = carregarTemplateBase();
  const htmlResolvido = renderTemplateHtml(templateBase, escopoTemplate);
  const buffer = await renderizarHtmlParaPdf(htmlResolvido);

  return {
    buffer,
    nomeArquivo: `proposta-${empreendimento.codigo}-rev${orcamento.revisao}.pdf`,
    empreendimentoId: empreendimento.id,
    empreendimentoCodigo: empreendimento.codigo,
    revisao: orcamento.revisao,
  };
}
