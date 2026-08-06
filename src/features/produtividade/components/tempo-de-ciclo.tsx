import { Card, CardContent } from "@/components/ui/card";

interface KpisCronologicos {
  engenharia: { tempoMedioDias: number | null; amostras: number };
  orcamentacao: { tempoMedioDias: number | null; mediaRevisoes: number | null; amostras: number };
  comercial: {
    tempoMedioProspeccaoDias: number | null;
    amostrasProspeccao: number;
    tempoMedioNegociacaoDias: number | null;
    amostrasNegociacao: number;
  };
  producao: {
    tempoMedioSuprimentosDias: number | null;
    tempoMedioProducaoDias: number | null;
    leadTimeTotalDias: number | null;
    amostras: number;
  };
}

interface LinhaEtapa {
  nome: string;
  dias: number | null;
  amostras: number;
}

function EtapaRow({ nome, dias, amostras }: LinhaEtapa) {
  // Sem meta fixa configurada ainda — mostra a barra proporcional a um
  // teto visual de 15 dias, só pra dar noção de escala entre as etapas.
  const pct = dias != null ? Math.min(100, (dias / 15) * 100) : 0;
  const cor = dias == null ? "bg-muted" : dias > 10 ? "bg-destructive" : dias > 5 ? "bg-warning" : "bg-success";

  return (
    <div className="mb-2.5 grid grid-cols-[130px_1fr_90px] items-center gap-3 last:mb-0">
      <span className="text-[12.5px] font-semibold">{nome}</span>
      <div className="h-[18px] rounded-md bg-secondary/50">
        <div className={`h-full rounded-md ${cor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-right text-xs font-bold">
        {dias != null ? `${dias.toFixed(1)} dias` : "sem dado"}
        {amostras > 0 && amostras < 3 && <span className="ml-1 font-normal text-muted-foreground">({amostras})</span>}
      </span>
    </div>
  );
}

export function TempoDeCiclo({ kpis }: { kpis: KpisCronologicos }) {
  const linhas: LinhaEtapa[] = [
    { nome: "Prospecção", dias: kpis.comercial.tempoMedioProspeccaoDias, amostras: kpis.comercial.amostrasProspeccao },
    { nome: "Negociação", dias: kpis.comercial.tempoMedioNegociacaoDias, amostras: kpis.comercial.amostrasNegociacao },
    { nome: "Engenharia", dias: kpis.engenharia.tempoMedioDias, amostras: kpis.engenharia.amostras },
    { nome: "Orçamentação", dias: kpis.orcamentacao.tempoMedioDias, amostras: kpis.orcamentacao.amostras },
    { nome: "Suprimentos", dias: kpis.producao.tempoMedioSuprimentosDias, amostras: kpis.producao.amostras },
    { nome: "Produção", dias: kpis.producao.tempoMedioProducaoDias, amostras: kpis.producao.amostras },
  ];

  const temAlgumDado = linhas.some((l) => l.dias != null);

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="mb-1 text-[15px] font-semibold">⏱ Do início até concluído, por etapa</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Mostra gargalo do processo — não é sobre quem está trabalhando nele, é sobre onde o tempo é perdido.
        </p>
        {temAlgumDado ? (
          linhas.map((l) => <EtapaRow key={l.nome} {...l} />)
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Ainda não há empreendimentos suficientes concluindo etapas pra calcular uma média confiável.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
