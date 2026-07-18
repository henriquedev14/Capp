export const dynamic = "force-dynamic";

import { DollarSign, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TabelaPrecosEditavel,
  TabelaTiersEditavel,
} from "@/features/orcamentacao/components/tabela-precos-editavel";
import { CriterioPrecificacaoToggle } from "@/features/orcamentacao/components/criterio-precificacao-toggle";
import { FormulaKitPontosCard } from "@/features/orcamentacao/components/formula-kit-pontos-card";
import { OrcamentacaoPrismaRepository } from "@/infra/db/prisma/repositories/orcamentacao-prisma-repository";
import { prisma } from "@/infra/db/prisma/client";
import { temPermissao } from "@/infra/auth/exigir-permissao";
import { PERMISSOES } from "@/core/auth/permissions";

const repo = new OrcamentacaoPrismaRepository();

export default async function PrecosPage() {
  const podeEditar = await temPermissao(PERMISSOES.ADMIN_GERENCIAR_PRECOS);
  const [precos, tiers, configuracao] = await Promise.all([
    repo.buscarTabelaPreco(),
    repo.buscarTiers(),
    prisma.configuracaoSistema.findUnique({ where: { id: "default" } }),
  ]);
  const criterioAtivo = configuracao?.criterioPrecificacao ?? "AREA";
  const precosArea = precos.filter((p) => p.criterio === "AREA");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        breadcrumb={["Orçamentação", "Preços"]}
        title="Tabela de Preços e Tiers"
        description="Valores base de mão de obra por kit/área e multiplicadores por padrão construtivo — usados em todo cálculo de orçamento."
      />

      {!podeEditar && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <ShieldAlert className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm text-foreground">
            Você está vendo em modo leitura — somente Admin pode editar estes valores.
          </p>
        </div>
      )}

      <CriterioPrecificacaoToggle criterioAtual={criterioAtivo} podeEditar={podeEditar} />

      {criterioAtivo === "PONTOS_TETO" ? (
        <FormulaKitPontosCard
          valorMinimo={Number(configuracao?.kitValorMinimo ?? 550)}
          pontosInclusos={configuracao?.kitPontosInclusos ?? 6}
          valorPorPontoExtra={Number(configuracao?.kitValorPorPontoExtra ?? 70)}
          podeEditar={podeEditar}
        />
      ) : (
        <Card>
          <CardHeader className="flex-row items-center gap-3 border-b border-border pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <DollarSign className="h-[18px] w-[18px] text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-[15px]">
                Preço base por Kit e Área <span className="ml-1.5 text-xs font-normal text-success">(ativo)</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {podeEditar ? (
              <TabelaPrecosEditavel precos={precosArea} />
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {precosArea.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 pr-4">{p.descricao}</td>
                      <td className="py-2 text-right font-mono">
                        {p.precoBase.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-[15px]">Multiplicadores por Tier</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {podeEditar ? (
            <TabelaTiersEditavel tiers={tiers} />
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {tiers.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-4">{t.nome}</td>
                    <td className="py-2 text-right font-mono">× {t.multiplicador.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
