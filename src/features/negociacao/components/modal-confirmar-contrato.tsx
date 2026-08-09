"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buscarDadosConfirmacaoContrato,
  registrarGanhaEGerarContrato,
  type DadosConfirmacaoContrato,
} from "@/features/negociacao/actions/negociacao-actions";

interface Props {
  empreendimentoId: string;
  onFechar: () => void;
}

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

/**
 * Modal de confirmação de dados antes de gerar o Contrato — abre
 * quando a negociação vira "Ganha". Dados do cliente vêm
 * pré-preenchidos do cadastro, mas são editáveis aqui (podem ter
 * mudado desde então); a Empresa do Grupo responsável precisa ser
 * escolhida manualmente. Item C do desenho v2 (08/08/2026).
 */
export function ModalConfirmarContrato({ empreendimentoId, onFechar }: Props) {
  const router = useRouter();
  const [dados, setDados] = React.useState<DadosConfirmacaoContrato | null>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const [razaoSocial, setRazaoSocial] = React.useState("");
  const [cnpj, setCnpj] = React.useState("");
  const [endereco, setEndereco] = React.useState("");
  const [cidade, setCidade] = React.useState("");
  const [estado, setEstado] = React.useState("");
  const [empresaGrupoId, setEmpresaGrupoId] = React.useState("");
  const [cotacaoVencedoraId, setCotacaoVencedoraId] = React.useState("");
  const [valorFinal, setValorFinal] = React.useState(0);

  React.useEffect(() => {
    buscarDadosConfirmacaoContrato(empreendimentoId).then((r) => {
      if ("erro" in r) {
        setErro(r.erro);
        setCarregando(false);
        return;
      }
      setDados(r);
      setRazaoSocial(r.clienteRazaoSocial);
      setCnpj(r.clienteCnpj);
      setEndereco(r.clienteEndereco ?? "");
      setCidade(r.clienteCidade ?? "");
      setEstado(r.clienteEstado ?? "");
      setValorFinal(r.valorAtual);
      if (r.empresasGrupo.length === 1) setEmpresaGrupoId(r.empresasGrupo[0].id);
      if (r.cotacoesAtivas.length === 1) setCotacaoVencedoraId(r.cotacoesAtivas[0].id);
      setCarregando(false);
    });
  }, [empreendimentoId]);

  async function handleConfirmar() {
    setErro(null);
    setSalvando(true);
    try {
      const r = await registrarGanhaEGerarContrato({
        empreendimentoId,
        cotacaoVencedoraId: cotacaoVencedoraId || undefined,
        empresaGrupoId,
        clienteRazaoSocial: razaoSocial,
        clienteCnpj: cnpj,
        clienteEndereco: endereco,
        clienteCidade: cidade,
        clienteEstado: estado,
        valorFinal,
      });
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      router.refresh();
      onFechar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[15px] font-semibold">Confirmar dados para gerar o Contrato</h2>
          <button onClick={onFechar} className="rounded-md p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {carregando ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !dados ? (
            <p className="text-sm text-destructive">{erro}</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Razão social</label>
                  <input
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">CNPJ</label>
                  <input
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Estado</label>
                  <input
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    maxLength={2}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm uppercase"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Endereço</label>
                  <input
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Cidade</label>
                  <input
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Empresa do Grupo responsável</label>
                <select
                  value={empresaGrupoId}
                  onChange={(e) => setEmpresaGrupoId(e.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione...</option>
                  {dados.empresasGrupo.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </select>
              </div>

              {dados.cotacoesAtivas.length > 1 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Fornecedor vencedor</label>
                  <select
                    value={cotacaoVencedoraId}
                    onChange={(e) => setCotacaoVencedoraId(e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    {dados.cotacoesAtivas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fornecedorNome} — {formatBRL(c.totalGeral)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Valor final do contrato</label>
                <input
                  type="number"
                  value={valorFinal}
                  onChange={(e) => setValorFinal(parseFloat(e.target.value) || 0)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>

              {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{erro}</p>}
            </div>
          )}
        </div>

        {dados && (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" onClick={onFechar} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmar} disabled={salvando || !empresaGrupoId}>
              {salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Confirmar e gerar contrato
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
