import { prisma } from "@/infra/db/prisma/client";
import { verificarDisponibilidadeParaProducao } from "@/features/suprimentos/actions/suprimentos-actions";

const FASES_LIBERADAS: ("CONTRATADO" | "SUPRIMENTOS" | "PRODUCAO")[] = ["CONTRATADO", "SUPRIMENTOS", "PRODUCAO"];

export interface PedidoProducao {
  empreendimentoId: string;
  empreendimentoCodigo: string;
  empreendimentoNome: string;
  clienteNome: string;
  status: string;
  tipologiaId: string;
  tipologiaNome: string;
  quantidadeUnidades: number;
  dataProximaRemessa: string | null;
  situacaoMateriais: "OK" | "FALTANDO" | "SEM_LEVANTAMENTO" | "AVULSO_CONFERIR";
  itensFaltando: number;
}

/**
 * Lista os "pedidos" liberados pra produção — um por TIPOLOGIA (é nesse
 * nível que a produção realmente acontece), de empreendimentos que já
 * passaram da fase comercial (Contratado em diante). Cruza com o
 * Levantamento de Materiais + Estoque da obra pra já mostrar se dá pra
 * começar ou está faltando alguma coisa.
 */
export async function listarPedidosLiberadosParaProducao(): Promise<PedidoProducao[]> {
  const empreendimentos = await prisma.empreendimento.findMany({
    where: { status: { in: FASES_LIBERADAS }, excluidoEm: null },
    select: {
      id: true,
      codigo: true,
      nome: true,
      status: true,
      cliente: { select: { razaoSocial: true, nomeFantasia: true } },
      tipologias: { select: { id: true, nome: true, quantidadeUnidades: true } },
    },
    orderBy: { nome: "asc" },
  });

  const resultado: PedidoProducao[] = [];

  for (const emp of empreendimentos) {
    for (const tipologia of emp.tipologias) {
      // Data da próxima remessa relevante pra essa tipologia — via
      // Unidade (que liga pavimento + tipologia). Se não tiver esse
      // vínculo cadastrado, cai pra "sem data ainda" em vez de quebrar.
      const unidades = await prisma.unidade.findMany({
        where: { tipologiaId: tipologia.id },
        select: { pavimento: { select: { dataPrevistaRemessa: true } } },
      });
      const datas = unidades
        .map((u) => u.pavimento.dataPrevistaRemessa)
        .filter((d): d is Date => !!d)
        .sort((a, b) => a.getTime() - b.getTime());
      const dataProximaRemessa = datas[0] ? datas[0].toISOString().slice(0, 10) : null;

      // Situação dos materiais — reaproveita a mesma checagem usada pra
      // liberar o início de produção, então nunca diverge entre o que
      // essa tela mostra e o que realmente bloqueia/libera depois.
      const disponibilidade = await verificarDisponibilidadeParaProducao(emp.id, tipologia.id);
      let situacaoMateriais: PedidoProducao["situacaoMateriais"];
      let itensFaltando = 0;
      if ("erro" in disponibilidade) {
        situacaoMateriais = "SEM_LEVANTAMENTO";
      } else {
        itensFaltando = disponibilidade.itens.filter((i) => i.suficiente === false).length;
        const temAvulsoParaConferir = disponibilidade.itens.some((i) => i.suficiente === null);
        situacaoMateriais = itensFaltando > 0 ? "FALTANDO" : temAvulsoParaConferir ? "AVULSO_CONFERIR" : "OK";
      }

      resultado.push({
        empreendimentoId: emp.id,
        empreendimentoCodigo: emp.codigo,
        empreendimentoNome: emp.nome,
        clienteNome: emp.cliente.nomeFantasia || emp.cliente.razaoSocial,
        status: emp.status,
        tipologiaId: tipologia.id,
        tipologiaNome: tipologia.nome,
        quantidadeUnidades: tipologia.quantidadeUnidades,
        dataProximaRemessa,
        situacaoMateriais,
        itensFaltando,
      });
    }
  }

  // Ordena por data de remessa mais próxima primeiro (sem data vai pro
  // final) — é o que mais importa pra decidir o que produzir primeiro.
  return resultado.sort((a, b) => {
    if (!a.dataProximaRemessa && !b.dataProximaRemessa) return 0;
    if (!a.dataProximaRemessa) return 1;
    if (!b.dataProximaRemessa) return -1;
    return a.dataProximaRemessa.localeCompare(b.dataProximaRemessa);
  });
}
