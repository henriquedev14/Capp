import type { Empreendimento as PrismaEmpreendimento } from "@/generated/prisma";

import { prisma } from "@/infra/db/prisma/client";
import { gerarCodigoEmpreendimento } from "@/infra/db/codigos";
import type {
  EmpreendimentoRepository,
  EmpreendimentoResumo,
  EmpreendimentoFiltros,
} from "@/core/empreendimentos/repositories/empreendimento-repository";
import type { Empreendimento } from "@/core/empreendimentos/entities/empreendimento";

/**
 * Implementação concreta de EmpreendimentoRepository usando Prisma + PostgreSQL.
 *
 * Esta classe é o único lugar do projeto que sabe que "Empreendimento" é
 * uma tabela Postgres acessada via Prisma. Ela converte entre o tipo
 * gerado pelo Prisma (que usa `Decimal` para valores monetários, por
 * exemplo) e a entidade de domínio pura definida em core/.
 */
export class EmpreendimentoPrismaRepository implements EmpreendimentoRepository {
  async findById(id: string): Promise<Empreendimento | null> {
    const record = await prisma.empreendimento.findUnique({ where: { id } });
    if (!record) return null;
    // Não retorna excluídos em buscas normais
    if (record.excluidoEm) return null;
    return toDomain(record);
  }

  async findByIdIncluindoExcluidos(id: string): Promise<Empreendimento | null> {
    const record = await prisma.empreendimento.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findMany(): Promise<Empreendimento[]> {
    const records = await prisma.empreendimento.findMany({
      where: { excluidoEm: null },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toDomain);
  }

  async findManyResumo(filtros?: EmpreendimentoFiltros): Promise<EmpreendimentoResumo[]> {
    const records = await prisma.empreendimento.findMany({
      where: {
        excluidoEm: null,
        ...(filtros?.clienteId && { clienteId: filtros.clienteId }),
        ...(filtros?.status && { status: filtros.status }),
        ...(filtros?.busca && {
          OR: [
            { nome: { contains: filtros.busca, mode: "insensitive" } },
            { cidade: { contains: filtros.busca, mode: "insensitive" } },
            { cliente: { razaoSocial: { contains: filtros.busca, mode: "insensitive" } } },
            { cliente: { nomeFantasia: { contains: filtros.busca, mode: "insensitive" } } },
          ],
        }),
      },
      include: { cliente: { select: { razaoSocial: true, nomeFantasia: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return records.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      nome: r.nome,
      clienteNome: r.cliente.nomeFantasia ?? r.cliente.razaoSocial,
      cidade: r.cidade,
      estado: r.estado,
      status: r.status,
      tipo: r.tipo,
      updatedAt: r.updatedAt,
    }));
  }

  async create(
    data: Omit<Empreendimento, "id" | "codigo" | "createdAt" | "updatedAt">
  ): Promise<Empreendimento> {
    const codigo = await gerarCodigoEmpreendimento();
    const record = await prisma.empreendimento.create({
      data: {
        codigo,
        nome: data.nome,
        clienteId: data.clienteId,
        cidade: data.cidade,
        estado: data.estado,
        endereco: data.endereco,
        tipo: data.tipo,
        construtora: data.construtora,
        incorporadora: data.incorporadora,
        tipoEstrutura: data.tipoEstrutura,
        metodoConstrutivo: data.metodoConstrutivo,
        tipoLaje: data.tipoLaje,
        tipoVedacao: data.tipoVedacao,
        responsavelComercial: data.responsavelComercial,
        status: data.status,
        tier: data.tier,
        criterioPrecificacao: data.criterioPrecificacao,
        dataPrevistaInicio: data.dataPrevistaInicio,
        dataPrevistaEntrega: data.dataPrevistaEntrega,
        responsavelComercialUserId: data.responsavelComercialUserId,
        responsavelEngenhariaUserId: data.responsavelEngenhariaUserId,
        responsavelOrcamentacaoUserId: data.responsavelOrcamentacaoUserId,
        observacoes: data.observacoes,
        temHall: data.temHall,
        hallTipo: data.hallTipo ?? null,
        hallQuantidadeEspecifica: data.hallQuantidadeEspecifica ?? null,
        kitEletrico: data.kitEletrico,
        kitHidraulico: data.kitHidraulico,
        kitQdc: data.kitQdc,
        tiposInstalacao: JSON.stringify(data.tiposInstalacao ?? []),
      },
    });
    return toDomain(record);
  }

  async update(
    id: string,
    data: Partial<Omit<Empreendimento, "id" | "codigo" | "createdAt" | "updatedAt">>
  ): Promise<Empreendimento> {
    const record = await prisma.empreendimento.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.clienteId !== undefined && { clienteId: data.clienteId }),
        ...(data.cidade !== undefined && { cidade: data.cidade }),
        ...(data.estado !== undefined && { estado: data.estado }),
        ...(data.endereco !== undefined && { endereco: data.endereco }),
        ...(data.tipo !== undefined && { tipo: data.tipo }),
        ...(data.construtora !== undefined && { construtora: data.construtora }),
        ...(data.incorporadora !== undefined && { incorporadora: data.incorporadora }),
        ...(data.tipoEstrutura !== undefined && { tipoEstrutura: data.tipoEstrutura }),
        ...(data.metodoConstrutivo !== undefined && {
          metodoConstrutivo: data.metodoConstrutivo,
        }),
        ...(data.tipoLaje !== undefined && { tipoLaje: data.tipoLaje }),
        ...(data.tipoVedacao !== undefined && { tipoVedacao: data.tipoVedacao }),
        ...(data.responsavelComercial !== undefined && {
          responsavelComercial: data.responsavelComercial,
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.tier !== undefined && { tier: data.tier }),
        ...(data.criterioPrecificacao !== undefined && { criterioPrecificacao: data.criterioPrecificacao }),
        ...(data.valorEstimado !== undefined && { valorEstimado: data.valorEstimado }),
        ...(data.dataPrevistaInicio !== undefined && {
          dataPrevistaInicio: data.dataPrevistaInicio,
        }),
        ...(data.dataPrevistaEntrega !== undefined && {
          dataPrevistaEntrega: data.dataPrevistaEntrega,
        }),
        ...(data.responsavelComercialUserId !== undefined && {
          responsavelComercialUserId: data.responsavelComercialUserId,
        }),
        ...(data.responsavelEngenhariaUserId !== undefined && {
          responsavelEngenhariaUserId: data.responsavelEngenhariaUserId,
        }),
        ...(data.responsavelOrcamentacaoUserId !== undefined && {
          responsavelOrcamentacaoUserId: data.responsavelOrcamentacaoUserId,
        }),
        ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
        ...(data.temHall !== undefined && { temHall: data.temHall }),
        ...(data.hallTipo !== undefined && { hallTipo: data.hallTipo }),
        ...(data.hallQuantidadeEspecifica !== undefined && { hallQuantidadeEspecifica: data.hallQuantidadeEspecifica }),
        ...(data.kitEletrico !== undefined && { kitEletrico: data.kitEletrico }),
        ...(data.kitHidraulico !== undefined && { kitHidraulico: data.kitHidraulico }),
        ...(data.kitQdc !== undefined && { kitQdc: data.kitQdc }),
        ...(data.tiposInstalacao !== undefined && { tiposInstalacao: JSON.stringify(data.tiposInstalacao) }),
      },
    });
    return toDomain(record);
  }

  /**
   * [CORREÇÃO C2/C3.1, revisão] Substitui o antigo `delete()` físico.
   *
   * Atomicidade (ponto 1): update do Empreendimento + criação do evento de
   * timeline acontecem na MESMA transação Prisma (`prisma.$transaction`),
   * usando o mesmo `tx` pros dois — se o evento falhar, o update também
   * sofre rollback. Não usa mais `TimelinePrismaRepository` (que fala com
   * o singleton fora de qualquer transação).
   *
   * Idempotência sob concorrência real (ponto 2): em vez de
   * `findUnique → verificar → update` (que tem uma janela de corrida entre
   * a leitura e a escrita), usa `updateMany` com `excluidoEm: null` na
   * condição — o Postgres resolve a concorrência sozinho via lock de linha:
   * duas requisições simultâneas nunca conseguem as duas MARCAR
   * `count === 1`; a segunda sempre vê `excluidoEm` já preenchido (após
   * esperar a primeira liberar o lock) e recebe `count === 0`. Só quem
   * recebe `count === 1` cria o evento — a outra não duplica nada.
   */
  async arquivar(id: string, usuarioId: string): Promise<Empreendimento> {
    return prisma.$transaction(async (tx) => {
      const resultado = await tx.empreendimento.updateMany({
        where: { id, excluidoEm: null },
        data: { excluidoEm: new Date(), excluidoPorId: usuarioId },
      });

      if (resultado.count === 1) {
        // Fomos nós que arquivamos agora de fato — registra o evento.
        await tx.eventoEmpreendimento.create({
          data: {
            empreendimentoId: id,
            tipo: "MUDANCA_STATUS",
            titulo: "Empreendimento arquivado",
            usuarioId,
            meta: JSON.stringify({ evento: "EMPREENDIMENTO_ARQUIVADO" }),
          },
        });
      }
      // count === 0: já estava arquivado (por esta ou outra requisição
      // concorrente) — idempotente, não faz nada, não duplica evento.

      const atual = await tx.empreendimento.findUnique({ where: { id } });
      if (!atual) throw new Error("Empreendimento não encontrado.");
      return toDomain(atual);
    });
  }

  /** Mesma lógica de arquivar(), espelhada pra restauração. */
  async restaurar(id: string, usuarioId: string): Promise<Empreendimento> {
    return prisma.$transaction(async (tx) => {
      const resultado = await tx.empreendimento.updateMany({
        where: { id, excluidoEm: { not: null } },
        data: { excluidoEm: null, excluidoPorId: null },
      });

      if (resultado.count === 1) {
        await tx.eventoEmpreendimento.create({
          data: {
            empreendimentoId: id,
            tipo: "MUDANCA_STATUS",
            titulo: "Empreendimento restaurado",
            usuarioId,
            meta: JSON.stringify({ evento: "EMPREENDIMENTO_RESTAURADO" }),
          },
        });
      }

      const atual = await tx.empreendimento.findUnique({ where: { id } });
      if (!atual) throw new Error("Empreendimento não encontrado.");
      return toDomain(atual);
    });
  }
}

/**
 * Converte o registro retornado pelo Prisma para a entidade de domínio pura.
 */
function toDomain(record: PrismaEmpreendimento): Empreendimento {
  return {
    id: record.id,
    codigo: record.codigo,
    nome: record.nome,
    clienteId: record.clienteId,
    cidade: record.cidade,
    estado: record.estado,
    endereco: record.endereco,
    tipo: record.tipo,
    construtora: record.construtora,
    incorporadora: record.incorporadora,
    tipoEstrutura: record.tipoEstrutura,
    metodoConstrutivo: record.metodoConstrutivo,
    tipoLaje: record.tipoLaje,
    tipoVedacao: record.tipoVedacao,
    responsavelComercial: record.responsavelComercial,
    status: record.status,
    tier: record.tier,
    criterioPrecificacao: record.criterioPrecificacao,
    dataPrevistaInicio: record.dataPrevistaInicio,
    dataPrevistaEntrega: record.dataPrevistaEntrega,
    responsavelComercialUserId: record.responsavelComercialUserId,
    responsavelEngenhariaUserId: record.responsavelEngenhariaUserId,
    responsavelOrcamentacaoUserId: record.responsavelOrcamentacaoUserId,
    observacoes: record.observacoes,
    temHall: record.temHall,
    hallTipo: record.hallTipo as "TODOS" | "ESPECIFICO" | null,
    hallQuantidadeEspecifica: record.hallQuantidadeEspecifica,
    kitEletrico: record.kitEletrico,
    kitHidraulico: record.kitHidraulico,
    kitQdc: record.kitQdc,
    tiposInstalacao: (() => {
      try { return JSON.parse(record.tiposInstalacao) as string[]; }
      catch { return []; }
    })(),
    excluidoEm: record.excluidoEm,
    excluidoPorId: record.excluidoPorId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
