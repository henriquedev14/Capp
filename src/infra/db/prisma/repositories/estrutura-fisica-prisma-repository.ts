import { prisma } from "@/infra/db/prisma/client";
import type { EstruturaFisicaRepository } from "@/core/empreendimentos/repositories/estrutura-fisica-repository";
import type {
  TorreInput,
  TipologiaInput,
  Torre,
  Tipologia,
} from "@/core/empreendimentos/entities/estrutura-fisica";

export class EstruturaFisicaPrismaRepository implements EstruturaFisicaRepository {
  async buscarEstrutura(empreendimentoId: string): Promise<Torre[]> {
    const torres = await prisma.torre.findMany({
      where: { empreendimentoId },
      orderBy: { ordem: "asc" },
      include: {
        pavimentos: {
          orderBy: { ordem: "asc" },
          include: { unidades: true },
        },
      },
    });

    return torres.map((t) => ({
      id: t.id,
      empreendimentoId: t.empreendimentoId,
      nome: t.nome,
      ordem: t.ordem,
      pavimentos: t.pavimentos.map((p) => ({
        id: p.id,
        // torreId aqui é não-nulo na prática (estrutura gerada pelo
        // Módulo 4 sempre usa Torre direto, nunca Bloco) — o `?? ""` é só
        // para satisfazer o tipo, já que o schema permite blocoId como
        // alternativa.
        torreId: p.torreId ?? "",
        nome: p.nome,
        ordem: p.ordem,
        unidades: p.unidades.map((u) => ({
          id: u.id,
          pavimentoId: u.pavimentoId,
          identificacao: u.identificacao,
          tipologiaId: u.tipologiaId,
        })),
      })),
    }));
  }

  async buscarTipologias(empreendimentoId: string): Promise<Tipologia[]> {
    const tipologias = await prisma.tipologia.findMany({
      where: { empreendimentoId },
      orderBy: { createdAt: "asc" },
    });

    return tipologias.map((t) => ({
      id: t.id,
      empreendimentoId: t.empreendimentoId,
      nome: t.nome,
      areaPrivativa: t.areaPrivativa ? Number(t.areaPrivativa) : null,
      quantidadeUnidades: t.quantidadeUnidades,
      descricao: t.descricao,
    }));
  }

  async substituirEstrutura(empreendimentoId: string, torres: TorreInput[]): Promise<void> {
    // Apaga a estrutura existente. onDelete: Cascade no schema garante que
    // apagar a Torre já apaga Pavimentos e Unidades dependentes — não é
    // preciso apagar cada nível manualmente.
    await prisma.torre.deleteMany({ where: { empreendimentoId } });

    if (torres.length === 0) return;

    for (const [indexTorre, torreInput] of torres.entries()) {
      const torre = await prisma.torre.create({
        data: {
          empreendimentoId,
          nome: torreInput.nome,
          ordem: indexTorre,
        },
      });

      // createMany é uma única query por Torre (não uma por Pavimento),
      // o que importa de verdade para empreendimentos grandes (uma torre
      // de 20 pavimentos não dispara 20 INSERTs sequenciais).
      const pavimentosData = Array.from({ length: torreInput.pavimentos }, (_, i) => ({
        torreId: torre.id,
        nome: `Pavimento ${i + 1}`,
        ordem: i,
      }));
      await prisma.pavimento.createMany({ data: pavimentosData });

      // Para criar as Unidades, precisamos dos IDs dos pavimentos recém
      // criados — createMany não retorna os registros, então buscamos em
      // seguida (uma query extra, mas ainda assim O(1) por Torre, não
      // O(pavimentos)).
      const pavimentosCriados = await prisma.pavimento.findMany({
        where: { torreId: torre.id },
        select: { id: true },
        orderBy: { ordem: "asc" },
      });

      const unidadesData = pavimentosCriados.flatMap((pavimento, pavIndex) =>
        Array.from({ length: torreInput.unidadesPorPavimento }, (_, uIndex) => ({
          pavimentoId: pavimento.id,
          identificacao: `${String(pavIndex + 1).padStart(2, "0")}${String(uIndex + 1).padStart(2, "0")}`,
        }))
      );

      if (unidadesData.length > 0) {
        await prisma.unidade.createMany({ data: unidadesData });
      }
    }
  }

  async substituirTipologias(empreendimentoId: string, tipologias: TipologiaInput[]): Promise<void> {
    // Em vez de apagar tudo e recriar, fazemos um diff:
    // - Tipologias existentes que têm levantamento vinculado são PRESERVADAS (nunca apagadas)
    // - Tipologias existentes sem levantamento e que não estão na nova lista são apagadas
    // - Novas tipologias são criadas
    // - Tipologias existentes que ainda estão na lista são atualizadas (nome/área)
    //
    // Isso garante que um levantamento importado nunca seja perdido por uma
    // edição acidental no formulário de empreendimento.

    const existentes = await prisma.tipologia.findMany({
      where: { empreendimentoId },
      include: { levantamentos: { select: { id: true } } },
    });

    // Tipologias com levantamento — nunca podem ser apagadas
    const comLevantamento = new Set(
      existentes.filter((t) => t.levantamentos.length > 0).map((t) => t.id)
    );

    // Nomes das novas tipologias (para matching por nome)
    const novosNomes = tipologias.map((t) => t.nome.trim().toLowerCase());

    // Apaga tipologias que não estão na nova lista E não têm levantamento
    for (const existente of existentes) {
      const aindaExiste = novosNomes.includes(existente.nome.trim().toLowerCase());
      if (!aindaExiste && !comLevantamento.has(existente.id)) {
        await prisma.tipologia.delete({ where: { id: existente.id } });
      }
    }

    // Upsert cada tipologia nova
    for (const tipologia of tipologias) {
      const nomeNorm = tipologia.nome.trim().toLowerCase();
      const existente = existentes.find(
        (e) => e.nome.trim().toLowerCase() === nomeNorm
      );

      if (existente) {
        // Atualiza nome/área sem apagar
        await prisma.tipologia.update({
          where: { id: existente.id },
          data: {
            nome: tipologia.nome,
            areaPrivativa: tipologia.areaPrivativa,
            quantidadeUnidades: tipologia.quantidadeUnidades,
            descricao: tipologia.descricao,
          },
        });
      } else {
        // Cria nova
        await prisma.tipologia.create({
          data: {
            empreendimentoId,
            nome: tipologia.nome,
            areaPrivativa: tipologia.areaPrivativa,
            quantidadeUnidades: tipologia.quantidadeUnidades,
            descricao: tipologia.descricao,
          },
        });
      }
    }
  }

  /**
   * Sincroniza a Tipologia sintética "Hall" — nunca cadastrada manualmente
   * pelo usuário na lista de tipologias, sempre derivada da configuração
   * de Hall do empreendimento (temHall + hallTipo + torres/pavimentos).
   *
   * Chamado automaticamente após salvar torres/tipologias no cadastro do
   * empreendimento. Segue a mesma regra de segurança das demais
   * tipologias: nunca apaga se já tiver levantamento vinculado.
   */
  async sincronizarTipologiaHall(
    empreendimentoId: string,
    temHall: boolean,
    quantidadeResolvida: number
  ): Promise<void> {
    const existente = await prisma.tipologia.findFirst({
      where: { empreendimentoId, nome: "Hall" },
      include: { levantamentos: { select: { id: true } }, levantamentosHidraulicos: { select: { id: true } } },
    });

    if (!temHall) {
      // Só remove se não houver nenhum levantamento vinculado — preserva
      // histórico caso o usuário desmarque "tem hall" por engano depois
      // de já ter feito o levantamento.
      if (existente && existente.levantamentos.length === 0 && existente.levantamentosHidraulicos.length === 0) {
        await prisma.tipologia.delete({ where: { id: existente.id } });
      }
      return;
    }

    const quantidade = Math.max(1, quantidadeResolvida);

    if (existente) {
      await prisma.tipologia.update({
        where: { id: existente.id },
        data: { quantidadeUnidades: quantidade },
      });
    } else {
      await prisma.tipologia.create({
        data: {
          empreendimentoId,
          nome: "Hall",
          quantidadeUnidades: quantidade,
          descricao: "Hall comum — gerado automaticamente a partir da configuração de Hall do empreendimento.",
        },
      });
    }
  }
}
