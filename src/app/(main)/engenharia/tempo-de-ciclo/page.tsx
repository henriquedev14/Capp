export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";
import { listarTempoDeCicloLevantamentos, calcularMediaDiasPorTipo, listarTempoMaterialAteProducao } from "@/features/engenharia/lib/tempo-de-ciclo";

const LIMITE_ATENCAO_DIAS = 7;

export default async function TempoDeCicloPage() {
  const podeVer = await temPermissao(PERMISSOES.DASHBOARD_VER_ENGENHARIA);
  if (!podeVer) redirect("/painel");

  const [linhas, mediaPorTipo, tempoMaterialProducao] = await Promise.all([
    listarTempoDeCicloLevantamentos(),
    calcularMediaDiasPorTipo(),
    listarTempoMaterialAteProducao(),
  ]);

  const pendentesAtrasados = linhas.filter((l) => l.status !== "VALIDADO" && l.diasEmAberto > LIMITE_ATENCAO_DIAS);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={["Engenharia", "Tempo de Ciclo"]}
        title="Tempo de Ciclo dos Levantamentos"
        description="Quanto tempo cada levantamento leva do Rascunho até o Validado — pra identificar gargalos por tipo ou por obra."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {mediaPorTipo.map((m) => (
          <Card key={m.tipo}>
            <CardContent className="pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Média — {m.tipo} ({m.quantidade} validados)
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{m.mediaDias} dias úteis</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendentesAtrasados.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-center gap-2 pt-5 text-sm font-medium text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {pendentesAtrasados.length} levantamento(s) em rascunho há mais de {LIMITE_ATENCAO_DIAS} dias úteis — precisam de
            atenção.
          </CardContent>
        </Card>
      )}

      {tempoMaterialProducao.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Material completo → Início de produção</h3>
              <p className="text-xs text-muted-foreground">
                Dias úteis entre o material da tipologia ficar completo e a produção realmente começar.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Obra</th>
                    <th className="px-3 py-2 text-left font-medium">Tipologia</th>
                    <th className="px-3 py-2 text-left font-medium">Material completo em</th>
                    <th className="px-3 py-2 text-left font-medium">Produção iniciada em</th>
                    <th className="px-3 py-2 text-right font-medium">Dias úteis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {tempoMaterialProducao.map((l, i) => (
                    <tr key={i} className={!l.producaoIniciadaEm && l.diasUteis > LIMITE_ATENCAO_DIAS ? "bg-warning/5" : ""}>
                      <td className="px-3 py-2">
                        <Link href={`/empreendimentos/${l.empreendimentoId}`} className="text-foreground hover:text-primary hover:underline">
                          {l.empreendimentoNome}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{l.tipologiaNome}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {l.materialCompletoEm.toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {l.producaoIniciadaEm ? l.producaoIniciadaEm.toLocaleDateString("pt-BR") : "Ainda não iniciou"}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-foreground">{l.diasUteis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Obra</th>
                  <th className="px-3 py-2 text-left font-medium">Tipologia</th>
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Dias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {linhas.map((l, i) => {
                  const atrasado = l.status !== "VALIDADO" && l.diasEmAberto > LIMITE_ATENCAO_DIAS;
                  return (
                    <tr key={i} className={atrasado ? "bg-warning/5" : ""}>
                      <td className="px-3 py-2">
                        <Link href={`/empreendimentos/${l.empreendimentoId}`} className="text-foreground hover:text-primary hover:underline">
                          {l.empreendimentoNome}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{l.tipologiaNome}</td>
                      <td className="px-3 py-2 text-muted-foreground">{l.tipo}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            l.status === "VALIDADO" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                          }`}
                        >
                          {l.status === "VALIDADO" ? "Validado" : "Em rascunho"}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-medium tabular-nums ${atrasado ? "text-warning" : "text-foreground"}`}>
                        <Clock className="mr-1 inline h-3 w-3" />
                        {l.diasEmAberto}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
