import { prisma } from "@/infra/db/prisma/client";
import type { TimelineRepository, CriarEventoInput } from "@/core/empreendimentos/repositories/timeline-repository";
import type { EventoEmpreendimento } from "@/core/empreendimentos/entities/timeline";

export class TimelinePrismaRepository implements TimelineRepository {
  async buscarEventos(empreendimentoId: string): Promise<EventoEmpreendimento[]> {
    const eventos = await prisma.eventoEmpreendimento.findMany({
      where: { empreendimentoId },
      include: { usuario: { select: { nome: true } } },
      orderBy: { createdAt: "desc" },
    });

    return eventos.map((e) => ({
      id: e.id,
      empreendimentoId: e.empreendimentoId,
      tipo: e.tipo,
      titulo: e.titulo,
      descricao: e.descricao,
      usuarioId: e.usuarioId,
      usuarioNome: e.usuario?.nome ?? null,
      meta: e.meta,
      createdAt: e.createdAt,
    }));
  }

  async criarEvento(input: CriarEventoInput): Promise<EventoEmpreendimento> {
    const evento = await prisma.eventoEmpreendimento.create({
      data: {
        empreendimentoId: input.empreendimentoId,
        tipo: input.tipo,
        titulo: input.titulo,
        descricao: input.descricao,
        usuarioId: input.usuarioId,
        meta: input.meta,
      },
      include: { usuario: { select: { nome: true } } },
    });

    return {
      id: evento.id,
      empreendimentoId: evento.empreendimentoId,
      tipo: evento.tipo,
      titulo: evento.titulo,
      descricao: evento.descricao,
      usuarioId: evento.usuarioId,
      usuarioNome: evento.usuario?.nome ?? null,
      meta: evento.meta,
      createdAt: evento.createdAt,
    };
  }
}
