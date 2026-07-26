import { prisma } from "@/infra/db/prisma/client";
import { logger } from "@/infra/logger/logger";
import { OrcamentacaoPrismaRepository } from "@/infra/db/prisma/repositories/orcamentacao-prisma-repository";
import { EmpreendimentoPrismaRepository } from "@/infra/db/prisma/repositories/empreendimento-prisma-repository";
import { ClientePrismaRepository } from "@/infra/db/prisma/repositories/cliente-prisma-repository";
import { EstruturaFisicaPrismaRepository } from "@/infra/db/prisma/repositories/estrutura-fisica-prisma-repository";
import { montarAnexoMateriaisPorFornecedor, type AnexoMateriaisProposta } from "@/features/orcamentacao/lib/proposta-anexo-materiais";
import { montarEscopoTemplate } from "@/features/orcamentacao/lib/proposta-escopo-adapter";
import { renderTemplateHtml } from "@/features/orcamentacao/lib/motor-template-html";
import { carregarTemplateBase, renderizarHtmlParaPdf } from "@/features/orcamentacao/lib/template-proposta-runtime";
import { validarCamposObrigatoriosProposta } from "@/core/orcamentacao/use-cases/validar-proposta";
import { montarDadosProposta } from "@/core/orcamentacao/use-cases/montar-dados-proposta";

const orcamentoRepo = new OrcamentacaoPrismaRepository();
const empreendimentoRepo = new EmpreendimentoPrismaRepository();
const clienteRepo = new ClientePrismaRepository();
const estruturaRepo = new EstruturaFisicaPrismaRepository();

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

export async function renderizarPropostaPdf(
  orcamentoId: string,
  usuarioId: string
): Promise<
  | { erro: string }
  | { buffer: Buffer; nomeArquivo: string; empreendimentoId: string; empreendimentoCodigo: string; revisao: number }
> {
  const orcamento = await orcamentoRepo.buscarPorId(orcamentoId);
  if (!orcamento) {
    logger.warn({ orcamentoId }, "tentativa de gerar proposta pra orçamento inexistente");
    return { erro: "Orçamento não encontrado." };
  }

  const empreendimento = await empreendimentoRepo.findById(orcamento.empreendimentoId);
  if (!empreendimento) return { erro: "Empreendimento não encontrado." };

  const idsFornecedor = Array.from(
    new Set(orcamento.itensMaterial.map((i) => i.fornecedorSelecionadoId).filter((id): id is string => !!id))
  );

  const [cliente, tipologias, usuario, fornecedores] = await Promise.all([
    clienteRepo.findById(empreendimento.clienteId),
    estruturaRepo.buscarTipologias(empreendimento.id),
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { nome: true, email: true, cargo: true, telefone: true } }),
    idsFornecedor.length > 0
      ? prisma.fornecedor.findMany({ where: { id: { in: idsFornecedor } }, select: { id: true, razaoSocial: true, nomeFantasia: true } })
      : Promise.resolve([]),
  ]);

  const nomeFornecedorPorId = new Map(fornecedores.map((f) => [f.id, f.nomeFantasia ?? f.razaoSocial]));

  const totalMaoDeObra = orcamento.itensServico.reduce((acc, i) => acc + i.total, 0);
  const anexoMateriais = montarAnexoMateriaisPorFornecedor(orcamento.itensMaterial, nomeFornecedorPorId);

  const erroValidacao = validarCamposObrigatoriosProposta({
    clienteEncontrado: !!cliente,
    totalMaoDeObra,
    totalMateriais: anexoMateriais.totalGeral,
  });
  if (erroValidacao) {
    logger.warn({ orcamentoId, empreendimentoId: empreendimento.id, erroValidacao }, "geração de proposta bloqueada por validação");
    return { erro: erroValidacao };
  }

  const data: PropostaInstitucionalData = montarDadosProposta({
    empreendimentoCodigo: empreendimento.codigo,
    empreendimentoNome: empreendimento.nome,
    empreendimentoCidade: empreendimento.cidade,
    empreendimentoEstado: empreendimento.estado,
    empreendimentoTipoEstrutura: empreendimento.tipoEstrutura,
    revisao: orcamento.revisao,
    cliente: {
      nomeFantasia: cliente!.nomeFantasia,
      razaoSocial: cliente!.razaoSocial,
      cnpj: cliente!.cnpj,
      logradouro: cliente!.logradouro,
      cidade: cliente!.cidade,
      estado: cliente!.estado,
    },
    totalUnidadesHabitacionais: tipologias.reduce((acc, t) => acc + (t.quantidadeUnidades ?? 0), 0),
    usuario: usuario ?? null,
    totalMaoDeObra,
    anexoMateriais,
  });

  const escopoTemplate = montarEscopoTemplate(data);
  const templateBase = carregarTemplateBase();
  const htmlResolvido = renderTemplateHtml(templateBase, escopoTemplate);

  let buffer: Buffer;
  try {
    buffer = await renderizarHtmlParaPdf(htmlResolvido);
  } catch (e) {
    logger.error(
      { orcamentoId, empreendimentoId: empreendimento.id, erro: e instanceof Error ? e.message : String(e) },
      "falha ao renderizar PDF da proposta (Chromium)"
    );
    return { erro: "Não foi possível gerar o PDF da proposta. Tente novamente em instantes." };
  }

  logger.info(
    {
      orcamentoId,
      empreendimentoId: empreendimento.id,
      empreendimentoCodigo: empreendimento.codigo,
      revisao: orcamento.revisao,
      totalGeral: totalMaoDeObra + anexoMateriais.totalGeral,
      fornecedoresUsados: Array.from(nomeFornecedorPorId.values()),
    },
    "proposta comercial gerada com sucesso"
  );

  return {
    buffer,
    nomeArquivo: `proposta-${empreendimento.codigo}-rev${orcamento.revisao}.pdf`,
    empreendimentoId: empreendimento.id,
    empreendimentoCodigo: empreendimento.codigo,
    revisao: orcamento.revisao,
  };
}
