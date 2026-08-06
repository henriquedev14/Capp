export type Zona = "TRANQUILO" | "PROCESSO_BLOQUEADO" | "OCUPADO_EM_DIA" | "SOBRECARGA_CRITICA";

export interface PessoaProdutividade {
  usuarioId: string;
  nome: string;
  papel: "COMERCIAL" | "ENGENHARIA" | "ORCAMENTISTA";
  cargaAtual: number;
  itensParados: number;
  produzidoNoPeriodo: number;
}

export interface PontoQuadrante extends PessoaProdutividade {
  zona: Zona;
}

export interface LimitesQuadrante {
  /** A partir de quantos itens na mão já considera "carga alta". */
  cargaAlta: number;
  /** A partir de quantos itens parados já considera "muitos parados". */
  itensParadosAlto: number;
}

export const LIMITES_PADRAO: LimitesQuadrante = {
  cargaAlta: 6,
  itensParadosAlto: 1,
};

/**
 * Classifica cada pessoa num dos 4 quadrantes (retangulares, não
 * diagonal — critério explícito, não "linha imaginária"):
 * - Tranquilo: carga baixa + poucos parados
 * - Processo bloqueado: carga baixa + muitos parados (algo trava mesmo
 *   com pouca coisa na mão — sinal de dependência externa, não de
 *   sobrecarga)
 * - Ocupado e em dia: carga alta + poucos parados (bom sinal — dando
 *   conta do volume)
 * - Sobrecarga crítica: carga alta + muitos parados (alerta real)
 */
export function classificarQuadrante(
  pessoas: PessoaProdutividade[],
  limites: LimitesQuadrante = LIMITES_PADRAO
): PontoQuadrante[] {
  return pessoas.map((p) => {
    const cargaAlta = p.cargaAtual >= limites.cargaAlta;
    const paradoAlto = p.itensParados >= limites.itensParadosAlto;

    let zona: Zona;
    if (cargaAlta && paradoAlto) zona = "SOBRECARGA_CRITICA";
    else if (cargaAlta && !paradoAlto) zona = "OCUPADO_EM_DIA";
    else if (!cargaAlta && paradoAlto) zona = "PROCESSO_BLOQUEADO";
    else zona = "TRANQUILO";

    return { ...p, zona };
  });
}

/**
 * Gera a lista "Atenções da equipe" — quem precisa de suporte (sobrecarga
 * crítica ou processo bloqueado) e os destaques (ocupado e em dia com
 * produção acima da média do grupo). Não é ranking punitivo — só
 * separa quem precisa de ajuda de quem merece reconhecimento.
 */
export function gerarAtencoesDaEquipe(pontos: PontoQuadrante[]): {
  precisamDeSuporte: PontoQuadrante[];
  destaques: PontoQuadrante[];
} {
  const precisamDeSuporte = pontos
    .filter((p) => p.zona === "SOBRECARGA_CRITICA" || p.zona === "PROCESSO_BLOQUEADO")
    .sort((a, b) => b.itensParados - a.itensParados);

  const mediaProduzido =
    pontos.length > 0 ? pontos.reduce((s, p) => s + p.produzidoNoPeriodo, 0) / pontos.length : 0;

  const destaques = pontos
    .filter((p) => p.zona === "OCUPADO_EM_DIA" && p.produzidoNoPeriodo > mediaProduzido)
    .sort((a, b) => b.produzidoNoPeriodo - a.produzidoNoPeriodo);

  return { precisamDeSuporte, destaques };
}
