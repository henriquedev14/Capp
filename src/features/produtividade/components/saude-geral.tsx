import { Card, CardContent } from "@/components/ui/card";

interface Props {
  orcamentosParados: number;
  cotacoesParadas: number;
  percentualProducao: number;
  realizadoTotal: number;
  metaTotal: number;
}

function corDoFarol(valor: number, limiteAtencao: number, limiteCritico: number): "ok" | "atencao" | "critico" {
  if (valor >= limiteCritico) return "critico";
  if (valor >= limiteAtencao) return "atencao";
  return "ok";
}

const ESTILOS = {
  ok: "bg-success/10 border-success/20",
  atencao: "bg-warning/10 border-warning/20",
  critico: "bg-destructive/10 border-destructive/20",
};
const FAROL = {
  ok: "bg-success shadow-[0_0_0_4px_rgba(22,163,74,0.15)]",
  atencao: "bg-warning shadow-[0_0_0_4px_rgba(217,119,6,0.15)]",
  critico: "bg-destructive shadow-[0_0_0_4px_rgba(220,38,38,0.15)]",
};

export function SaudeGeral({ orcamentosParados, cotacoesParadas, percentualProducao, realizadoTotal, metaTotal }: Props) {
  const statusOrcamentacao = corDoFarol(orcamentosParados, 3, 6);
  const statusCotacoes = corDoFarol(cotacoesParadas, 2, 4);
  const statusProducao = percentualProducao >= 90 ? "ok" : percentualProducao >= 70 ? "atencao" : "critico";

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      <Card className={ESTILOS[statusOrcamentacao]}>
        <CardContent className="relative pt-5">
          <span className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ${FAROL[statusOrcamentacao]}`} />
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Orçamentação</p>
          <p className="text-2xl font-extrabold">
            {orcamentosParados} <span className="text-xs font-semibold text-muted-foreground">parados</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Sem atualização há 7+ dias</p>
        </CardContent>
      </Card>

      <Card className={ESTILOS[statusCotacoes]}>
        <CardContent className="relative pt-5">
          <span className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ${FAROL[statusCotacoes]}`} />
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Cotações</p>
          <p className="text-2xl font-extrabold">
            {cotacoesParadas} <span className="text-xs font-semibold text-muted-foreground">sem resposta</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Fornecedor não respondeu há 5+ dias</p>
        </CardContent>
      </Card>

      <Card className={ESTILOS[statusProducao as "ok" | "atencao" | "critico"]}>
        <CardContent className="relative pt-5">
          <span className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ${FAROL[statusProducao as "ok" | "atencao" | "critico"]}`} />
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Produção</p>
          <p className="text-2xl font-extrabold">{percentualProducao}%</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {realizadoTotal} de {metaTotal} UH — meta do período
          </p>
        </CardContent>
      </Card>

      <Card className="bg-secondary/20">
        <CardContent className="pt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Como ler</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Verde = tranquilo, amarelo = de olho, vermelho = precisa de ação. Clique em qualquer área abaixo pra ver o
            detalhe por pessoa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
