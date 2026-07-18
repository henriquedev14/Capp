"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Building2,
  Briefcase,
  Users,
  NotebookPen,
  FolderOpen,
  Loader2,
  Layers,
  Plus,
  Trash2,
  DoorOpen,
} from "lucide-react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/components/form/form-section";
import { TextFormField } from "@/components/form/text-form-field";
import { SelectFormField } from "@/components/form/select-form-field";
import { DateFormField } from "@/components/form/date-form-field";
import { TextareaFormField } from "@/components/form/textarea-form-field";
import { PersonFormField, type PersonOption } from "@/components/form/person-form-field";
import { TorresField } from "@/features/empreendimentos/components/torres-field";
import { TiposInstalacaoField } from "@/features/empreendimentos/components/tipos-instalacao-field";
import { EnderecoFields } from "@/components/form/endereco-fields";
import { TierSelectField } from "@/features/tiers/components/tier-select-field";
import { getTierOption } from "@/features/tiers/constants";

import {
  empreendimentoSchema,
  type EmpreendimentoFormValues,
} from "@/features/empreendimentos/schemas/empreendimento-schema";
import {
  ESTADOS_BR,
  TIPOS_EMPREENDIMENTO,
  TIPOS_ESTRUTURA,
  STATUS_OPORTUNIDADE,
} from "@/features/empreendimentos/constants";
import {
  criarEmpreendimento,
  atualizarEmpreendimento,
} from "@/features/empreendimentos/actions/empreendimento-actions";
import type { Empreendimento } from "@/core/empreendimentos/entities/empreendimento";
import type { Torre, Tipologia } from "@/core/empreendimentos/entities/estrutura-fisica";

function dataParaInputValue(data?: Date | null): string {
  if (!data) return "";
  return data.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Achata a estrutura física já salva (Torre -> Pavimento -> Unidade) de
 * volta para o formato simples de input (nome + contagens) usado pelo
 * formulário. Assume que todos os pavimentos de uma torre têm a mesma
 * quantidade de unidades (premissa válida porque é assim que o sistema
 * sempre gera a estrutura, via "substituirEstrutura") — se algum dia a
 * estrutura física for editada fora deste formulário de um jeito que
 * quebre essa premissa, esta função passa a mostrar só uma aproximação.
 */
function torresParaFormValues(torres: Torre[]) {
  return torres.map((torre) => ({
    nome: torre.nome,
    pavimentos: torre.pavimentos.length,
    unidadesPorPavimento: torre.pavimentos[0]?.unidades.length ?? 1,
  }));
}

function tipologiasParaFormValues(tipologias: Tipologia[]) {
  return tipologias.map((t) => ({
    nome: t.nome,
    areaPrivativa: t.areaPrivativa ?? undefined,
    quantidadeUnidades: t.quantidadeUnidades ?? 1,
    descricao: t.descricao ?? "",
  }));
}

interface EmpreendimentoFormProps {
  clientesAtivos?: { value: string; label: string; tier?: number | null }[];
  usuariosAtivos?: PersonOption[];
  empreendimento?: Empreendimento;
  torresExistentes?: Torre[];
  tipologiasExistentes?: Tipologia[];
  podeDefinirTier?: boolean;
}

/**
 * Formulário completo de cadastro/edição de Empreendimento.
 * Recebe clientes e usuários ativos como prop (buscados pelo Server
 * Component pai) e, se `empreendimento` for passado, opera em modo edição.
 */
export function EmpreendimentoForm({
  clientesAtivos = [],
  usuariosAtivos = [],
  empreendimento,
  torresExistentes = [],
  tipologiasExistentes = [],
  podeDefinirTier = false,
}: EmpreendimentoFormProps) {
  const router = useRouter();
  const isEdicao = !!empreendimento;

  const [erro, setErro] = React.useState<string | null>(null);
  const [salvando, setSalvando] = React.useState(false);

  // Ref para bloquear double-submit — diferente do state `salvando`, a ref
  // é atualizada de forma síncrona e imediata no primeiro clique, sem
  // esperar o próximo ciclo de render. Isso elimina a janela de
  // milissegundos entre o clique e o disable do botão onde um segundo
  // submit poderia passar.
  const submitandoRef = React.useRef(false);

  const form = useForm<EmpreendimentoFormValues>({
    resolver: zodResolver(empreendimentoSchema),
    defaultValues: {
      nome: empreendimento?.nome ?? "",
      clienteId: empreendimento?.clienteId ?? "",
      cidade: empreendimento?.cidade ?? "",
      estado: empreendimento?.estado ?? "",
      cep: "",
      logradouro: empreendimento?.endereco ?? "",
      numero: "",
      tipo: empreendimento?.tipo ?? "",
      construtora: empreendimento?.construtora ?? "",
      incorporadora: empreendimento?.incorporadora ?? "",
      tipoEstrutura: empreendimento?.tipoEstrutura ?? "",
      kitEletrico: empreendimento?.kitEletrico ?? false,
      kitHidraulico: empreendimento?.kitHidraulico ?? false,
      kitQdc: empreendimento?.kitQdc ?? false,
      tiposInstalacao: empreendimento?.tiposInstalacao ?? [],
      responsavelComercial: empreendimento?.responsavelComercial ?? "",
      // Status sempre nasce como PROSPECCAO na criação (campo oculto nesse
      // modo — veja isEdicao mais abaixo). Usar "" aqui falharia na
      // validação do Zod, que exige um valor do enum mesmo com o campo
      // escondido da UI.
      statusOportunidade: empreendimento?.status ?? "PROSPECCAO",
      tier: empreendimento?.tier != null ? String(empreendimento.tier) : "",
      criterioPrecificacao: empreendimento?.criterioPrecificacao ?? "",
      dataPrevistaInicio: dataParaInputValue(empreendimento?.dataPrevistaInicio),
      dataPrevistaEntrega: dataParaInputValue(empreendimento?.dataPrevistaEntrega),
      responsavelComercialEquipe: empreendimento?.responsavelComercialUserId ?? "",
      responsavelEngenharia: empreendimento?.responsavelEngenhariaUserId ?? "",
      responsavelOrcamentacao: empreendimento?.responsavelOrcamentacaoUserId ?? "",
      temHall: empreendimento?.temHall ?? false,
      hallTipo: empreendimento?.hallTipo ?? "TODOS",
      hallQuantidadeEspecifica: empreendimento?.hallQuantidadeEspecifica ?? undefined,
      torres: torresParaFormValues(torresExistentes),
      tipologias: tipologiasParaFormValues(tipologiasExistentes),
      observacoes: empreendimento?.observacoes ?? "",
    },
    mode: "onChange",
  });

  const tipologiasArray = useFieldArray({ control: form.control, name: "tipologias" });

  // ---------------------------------------------------------------------
  // Fluxo em etapas — as 4 primeiras são as FormSections que já existiam
  // (conteúdo interno intacto, só controlando visibilidade), a 5ª
  // ("Revisão") é nova: resumo de tudo antes de criar de verdade.
  // Todos os campos ficam sempre montados no DOM (só escondidos via
  // CSS), então trocar de etapa NUNCA perde dado already digitado.
  // ---------------------------------------------------------------------
  const ETAPAS = [
    { label: "Identificação" },
    { label: "Estrutura e Tipologias" },
    { label: "Comercial" },
    { label: "Observações" },
    { label: "Revisão" },
  ];
  const [etapaAtual, setEtapaAtual] = React.useState(0);
  const ultimaEtapa = etapaAtual === ETAPAS.length - 1;


  // ---------------------------------------------------------------------
  // Herança do Tier: ao selecionar/trocar a construtora, o tier do
  // empreendimento assume o tier dela ("o tier é do cliente, mas ajustável
  // por empreendimento"). O usuário pode ajustar manualmente depois — o
  // valor herdado só é reaplicado se a construtora for trocada de novo.
  // Em modo edição, o primeiro render não dispara (clienteAnteriorRef já
  // nasce com o clienteId salvo), preservando o tier gravado no banco.
  // ---------------------------------------------------------------------
  const clienteSelecionadoId = form.watch("clienteId");
  const clienteAnteriorRef = React.useRef(empreendimento?.clienteId ?? "");

  React.useEffect(() => {
    // Sem construtora selecionada, ou construtora não mudou: nada a herdar.
    if (!clienteSelecionadoId || clienteSelecionadoId === clienteAnteriorRef.current) return;
    clienteAnteriorRef.current = clienteSelecionadoId;

    const cliente = clientesAtivos.find((c) => c.value === clienteSelecionadoId);
    form.setValue("tier", cliente?.tier != null ? String(cliente.tier) : "", {
      shouldDirty: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteSelecionadoId]);

  const tierAtual = form.watch("tier");
  const tierDoClienteSelecionado = clientesAtivos.find(
    (c) => c.value === clienteSelecionadoId
  )?.tier;
  const tierHerdado =
    tierDoClienteSelecionado != null && String(tierDoClienteSelecionado) === tierAtual;

  async function onSubmit(values: EmpreendimentoFormValues) {
    if (submitandoRef.current) return;
    submitandoRef.current = true;

    setErro(null);
    setSalvando(true);
    try {
      const resultado = isEdicao
        ? await atualizarEmpreendimento(empreendimento.id, values)
        : await criarEmpreendimento(values);

      if ("erro" in resultado) {
        setErro(resultado.erro);
        setSalvando(false);
        submitandoRef.current = false;
        return;
      }

      router.push(`/empreendimentos/${resultado.id}`);
      router.refresh();
    } catch {
      setErro("Não foi possível salvar o empreendimento. Tente novamente.");
      setSalvando(false);
      submitandoRef.current = false;
    }
  }

  // Mostra erros de validação quando o submit é bloqueado pelo Zod
  const errosValidacao = Object.entries(form.formState.errors)
    .map(([, err]) => err?.message)
    .filter(Boolean) as string[];

  // Campos obrigatórios pendentes — pra explicar no botão desabilitado
  // POR QUE ele está desabilitado, em vez da pessoa só descobrir depois
  // de tentar salvar e ver uma lista de erro genérica.
  const nomeValor = form.watch("nome");
  const clienteValor = form.watch("clienteId");
  const tipoValor = form.watch("tipo");
  const dataInicioValor = form.watch("dataPrevistaInicio");
  const dataEntregaValor = form.watch("dataPrevistaEntrega");
  const camposPendentes: string[] = [];
  if (!nomeValor?.trim()) camposPendentes.push("nome do empreendimento");
  if (!clienteValor) camposPendentes.push("construtora");
  if (!tipoValor) camposPendentes.push("tipo de empreendimento");
  if (!dataInicioValor) camposPendentes.push("data prevista de início");
  if (!dataEntregaValor) camposPendentes.push("data prevista de entrega");

  // Duração prevista em meses, quando as duas datas existem — item 12
  // do pedido: "calcule a duração prevista, mostre em meses".
  const duracaoPrevistaMeses = (() => {
    if (!dataInicioValor || !dataEntregaValor) return null;
    const inicio = new Date(dataInicioValor);
    const fim = new Date(dataEntregaValor);
    if (fim <= inicio) return null; // validado separadamente abaixo, não mostra duração negativa
    const meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
    return Math.max(meses, 1);
  })();
  const datasInvertidas = !!(dataInicioValor && dataEntregaValor && new Date(dataEntregaValor) <= new Date(dataInicioValor));

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6 pb-28"
      >
        {/* Barra de progresso — etapa atual, concluídas, e não deixa a
            pessoa se perder no meio do cadastro. */}
        <div className="flex items-center gap-1">
          {ETAPAS.map((etapa, idx) => (
            <button
              key={etapa.label}
              type="button"
              onClick={() => setEtapaAtual(idx)}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <div
                className={`h-1.5 w-full rounded-full transition-colors ${
                  idx < etapaAtual ? "bg-success" : idx === etapaAtual ? "bg-primary" : "bg-secondary"
                }`}
              />
              <span
                className={`text-[11px] font-medium ${
                  idx === etapaAtual ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {etapa.label}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <div className="flex flex-col gap-6">
        <div className={etapaAtual === 0 ? "" : "hidden"}>
        <FormSection
          id="informacoes-gerais"
          icon={Building2}
          title="Informações gerais"
          description="Identificação principal do empreendimento"
        >
          <TextFormField
            control={form.control}
            name="nome"
            label="Nome do empreendimento"
            placeholder="Ex: Residencial Vista Verde"
            colSpan="full"
            required
          />
          <SelectFormField
            control={form.control}
            name="clienteId"
            label="Construtora (cliente)"
            options={clientesAtivos}
            placeholder={
              clientesAtivos.length === 0
                ? "Nenhuma construtora cadastrada"
                : "Selecione a construtora"
            }
            required
          />
          <SelectFormField
            control={form.control}
            name="tipo"
            label="Tipo de empreendimento"
            options={TIPOS_EMPREENDIMENTO}
            placeholder="Selecione o tipo"
            required
          />
          <TextFormField
            control={form.control}
            name="incorporadora"
            label="Incorporadora"
            placeholder="Empresa responsável pela incorporação"
          />
          <EnderecoFields
            cep={form.watch("cep") ?? ""}
            logradouro={form.watch("logradouro") ?? ""}
            numero={form.watch("numero") ?? ""}
            cidade={form.watch("cidade") ?? ""}
            estado={form.watch("estado") ?? ""}
            onChange={(campo, valor) =>
              form.setValue(campo as keyof EmpreendimentoFormValues, valor, { shouldDirty: true })
            }
            estadosBR={ESTADOS_BR}
          />
        </FormSection>
        </div>

        <div className={etapaAtual === 1 ? "" : "hidden"}>
        <FormSection
          id="estrutura-tecnica"
          icon={Layers}
          title="Estrutura Técnica"
          description="Tipo de estrutura, kits contratados, torres e tipologias"
        >
          <SelectFormField
            control={form.control}
            name="tipoEstrutura"
            label="Tipo de estrutura"
            options={TIPOS_ESTRUTURA}
            placeholder="Selecione o tipo de estrutura"
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Tipos de kit
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (selecione todos que se aplicam)
              </span>
            </label>
            <div className="flex flex-wrap gap-4">
              {[
                { name: "kitEletrico" as const, label: "Kit Elétrico" },
                { name: "kitHidraulico" as const, label: "Kit Hidráulico" },
                { name: "kitQdc" as const, label: "Kit QDC" },
              ].map(({ name, label }) => (
                <label key={name} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register(name)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tipos de instalação — só aparece com Kit Elétrico marcado */}
          {form.watch("kitEletrico") && (
            <div className="sm:col-span-2">
              <TiposInstalacaoField
                selecionados={form.watch("tiposInstalacao") ?? []}
                onChange={(tipos) =>
                  form.setValue("tiposInstalacao", tipos, { shouldDirty: true })
                }
              />
            </div>
          )}
          <div className="sm:col-span-2 flex flex-col gap-6">
            {/* Hall */}
            <label className="flex items-center gap-2.5 cursor-pointer w-fit">
              <input
                type="checkbox"
                {...form.register("temHall")}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <DoorOpen className="h-4 w-4 text-muted-foreground" />
                Este empreendimento terá Hall
              </span>
            </label>

            <TorresField
              control={form.control}
              register={form.register}
              setValue={form.setValue}
              watch={form.watch}
              torresIniciais={torresParaFormValues(torresExistentes)}
            />

            {/* Lista dinâmica de tipologias */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-medium">Tipologias</span>
                {(() => {
                  const torresForm = form.watch("torres") ?? [];
                  const tipologiasForm = form.watch("tipologias") ?? [];
                  const totalReal = torresForm.reduce(
                    (acc, t) => acc + (Number(t.pavimentos) || 0) * (Number(t.unidadesPorPavimento) || 0),
                    0
                  );
                  const totalTipologias = tipologiasForm.reduce(
                    (acc, t) => acc + (Number(t.quantidadeUnidades) || 0),
                    0
                  );
                  if (totalReal === 0) return null;

                  // 4 estados, não 2: neutro antes de começar, amarelo
                  // enquanto incompleto (não é erro, só ainda não terminou),
                  // verde quando bate certinho, vermelho só quando
                  // realmente distribuiu MAIS do que existe (inconsistência
                  // de verdade, não "ainda não preencheu tudo").
                  let estado: "neutro" | "progresso" | "completo" | "inconsistente";
                  if (totalTipologias === 0) estado = "neutro";
                  else if (totalTipologias > totalReal) estado = "inconsistente";
                  else if (totalTipologias === totalReal) estado = "completo";
                  else estado = "progresso";

                  const config = {
                    neutro: { classe: "bg-muted text-muted-foreground", icone: "○" },
                    progresso: { classe: "bg-warning/10 text-warning", icone: "◐" },
                    completo: { classe: "bg-success/10 text-success", icone: "✓" },
                    inconsistente: { classe: "bg-destructive/10 text-destructive", icone: "⚠" },
                  }[estado];

                  const restantes = totalReal - totalTipologias;
                  const percentual = totalReal > 0 ? Math.round((totalTipologias / totalReal) * 100) : 0;

                  return (
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.classe}`}
                      >
                        {config.icone} {totalTipologias} de {totalReal} unidades distribuídas
                        {estado === "inconsistente" && ` (${Math.abs(restantes)} a mais que o total)`}
                        {estado === "progresso" && ` (faltam ${restantes})`}
                      </span>
                      {estado !== "neutro" && (
                        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-secondary/60">
                          <div
                            className={`h-full rounded-full transition-all ${
                              estado === "completo" ? "bg-success" : estado === "inconsistente" ? "bg-destructive" : "bg-warning"
                            }`}
                            style={{ width: `${Math.min(percentual, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {tipologiasArray.fields.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">
                  Nenhuma tipologia adicionada ainda.
                </p>
              )}

              {tipologiasArray.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-lg border border-border bg-secondary/30 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Tipologia {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => tipologiasArray.remove(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-sm font-medium">Nome *</label>
                      <Input
                        placeholder="Ex: Tipo A — 2 quartos"
                        {...form.register(`tipologias.${index}.nome`)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Área privativa (m²)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        inputMode="decimal"
                        placeholder="Ex: 65.50"
                        {...form.register(`tipologias.${index}.areaPrivativa`)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-1">
                      <label className="text-sm font-medium">
                        Quantidade de unidades *
                      </label>
                      <Input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        placeholder="Ex: 120"
                        {...form.register(`tipologias.${index}.quantidadeUnidades`)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Quantas unidades desta tipologia existem no empreendimento —
                        usado para consolidar o levantamento e a orçamentação.
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-sm font-medium">Descrição</label>
                      <Input
                        placeholder="Detalhes adicionais da tipologia"
                        {...form.register(`tipologias.${index}.descricao`)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => tipologiasArray.append({ nome: "", descricao: "", quantidadeUnidades: 1 })}
              >
                <Plus className="h-4 w-4" />
                Adicionar tipologia
              </Button>
            </div>
          </div>
        </FormSection>
        </div>

        <div className={etapaAtual === 2 ? "" : "hidden"}>
        <FormSection
          id="informacoes-comerciais"
          icon={Briefcase}
          title="Informações comerciais"
          description="Dados da oportunidade e previsão de execução"
        >
          {isEdicao ? (
            <SelectFormField
              control={form.control}
              name="statusOportunidade"
              label="Status da oportunidade"
              options={STATUS_OPORTUNIDADE}
              placeholder="Selecione o status"
              required
            />
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Status da oportunidade</label>
              <div className="flex h-10 items-center rounded-md border border-input bg-secondary/50 px-3 text-sm text-muted-foreground">
                Prospecção (automático ao criar)
              </div>
            </div>
          )}
          {podeDefinirTier ? (
            <TierSelectField
              control={form.control}
              name="tier"
              label="Tier do empreendimento"
              descricao={
                tierHerdado
                  ? `Herdado da construtora (${getTierOption(tierDoClienteSelecionado)?.nome ?? ""}) — ajuste se este empreendimento tiver padrão diferente.`
                  : "Define o multiplicador do serviço HGI na orçamentação deste empreendimento."
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Tier do empreendimento</label>
              <div className="flex h-10 items-center rounded-md border border-input bg-secondary/50 px-3 text-sm text-muted-foreground">
                {tierAtual ? getTierOption(Number(tierAtual))?.nome ?? `Tier ${tierAtual}` : "Herdado da construtora"}
              </div>
              <p className="text-xs text-muted-foreground">
                Somente Admin ou Diretor podem ajustar o Tier.
              </p>
            </div>
          )}
          <SelectFormField
            control={form.control}
            name="criterioPrecificacao"
            label="Critério de precificação (serviço HGI)"
            options={[
              { value: "PONTOS_TETO", label: "Ponto de teto" },
              { value: "AREA", label: "Metro quadrado (área privativa)" },
            ]}
            placeholder="Usar o padrão do sistema"
          />
          <DateFormField
            control={form.control}
            name="dataPrevistaInicio"
            label="Data prevista de início *"
          />
          <DateFormField
            control={form.control}
            name="dataPrevistaEntrega"
            label="Data prevista de entrega *"
          />
          {datasInvertidas && (
            <p className="sm:col-span-2 text-sm font-medium text-destructive">
              A data de entrega precisa ser depois da data de início.
            </p>
          )}
          {!datasInvertidas && duracaoPrevistaMeses !== null && (
            <p className="sm:col-span-2 text-sm text-muted-foreground">
              Duração prevista: <span className="font-medium text-foreground">{duracaoPrevistaMeses} {duracaoPrevistaMeses === 1 ? "mês" : "meses"}</span> (estimativa — pode ajustar essas datas conforme a obra evoluir).
            </p>
          )}
        </FormSection>
        </div>

        <div className={etapaAtual === 3 ? "" : "hidden"}>
        <FormSection
          id="observacoes"
          icon={NotebookPen}
          title="Observações"
          description="Informações adicionais relevantes ao empreendimento"
        >
          <div className="sm:col-span-2">
            <TextareaFormField
              control={form.control}
              name="observacoes"
              label="Observações"
              placeholder="Registre detalhes relevantes, restrições, particularidades do terreno, condições negociadas, etc."
            />
          </div>
        </FormSection>

        <FormSection
          id="documentos"
          icon={FolderOpen}
          title="Documentos"
          description="Plantas, memoriais e demais arquivos do empreendimento"
        >
          <div className="sm:col-span-2 rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isEdicao
                ? "Pra anexar documentos, salva essa edição e usa o card \"Documentos\" na página do empreendimento."
                : "Depois de criar o empreendimento, você vai poder anexar plantas, memoriais e outros arquivos direto na página dele."}
            </p>
          </div>
        </FormSection>
        </div>

        {/* Etapa 5 — Revisão. Resumo de tudo antes de criar de verdade,
            com atalho pra voltar direto na etapa que precisa de ajuste. */}
        <div className={etapaAtual === 4 ? "" : "hidden"}>
          <FormSection id="revisao" icon={Building2} title="Revisão final" description="Confira tudo antes de criar o empreendimento">
            <div className="sm:col-span-2 flex flex-col gap-3">
              {[
                { label: "Nome", valor: nomeValor || "—", etapa: 0 },
                {
                  label: "Construtora",
                  valor: clientesAtivos.find((c) => c.value === clienteValor)?.label ?? "—",
                  etapa: 0,
                },
                { label: "Tipo", valor: TIPOS_EMPREENDIMENTO.find((t) => t.value === tipoValor)?.label ?? "—", etapa: 0 },
                {
                  label: "Estrutura",
                  valor: `${(form.watch("torres") ?? []).length} torre(s), ${(form.watch("torres") ?? []).reduce((s, t) => s + (Number(t.pavimentos) || 0) * (Number(t.unidadesPorPavimento) || 0), 0)} unidade(s)`,
                  etapa: 1,
                },
                {
                  label: "Tipologias",
                  valor: `${(form.watch("tipologias") ?? []).length} cadastrada(s)`,
                  etapa: 1,
                },
                {
                  label: "Período previsto",
                  valor:
                    dataInicioValor && dataEntregaValor
                      ? `${dataInicioValor} → ${dataEntregaValor}${duracaoPrevistaMeses ? ` (${duracaoPrevistaMeses} meses)` : ""}`
                      : "—",
                  etapa: 2,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between border-b border-border/50 py-2">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{item.valor}</span>
                    <button
                      type="button"
                      onClick={() => setEtapaAtual(item.etapa)}
                      className="text-xs text-primary hover:underline"
                    >
                      editar
                    </button>
                  </div>
                </div>
              ))}
              <div className="mt-1 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                Etapa inicial ao criar: <span className="font-medium text-foreground">Prospecção</span> (automático,
                não editável aqui).
              </div>
            </div>
          </FormSection>
        </div>


        {errosValidacao.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-sm font-medium text-destructive mb-1">
              Corrija os seguintes campos antes de salvar:
            </p>
            <ul className="list-disc list-inside text-sm text-destructive/80 space-y-0.5">
              {errosValidacao.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Erro do servidor */}
        {erro && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {erro}
          </div>
        )}
          </div>

          {/* Painel de resumo — atualizado em tempo real conforme a
              pessoa preenche, pra sempre saber "o que já tenho até
              agora" sem precisar navegar entre etapas. */}
          <div className="hidden lg:block">
            <div className="sticky top-4 flex flex-col gap-3 rounded-xl border border-border bg-secondary/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumo</p>
              {[
                { label: "Nome", valor: nomeValor },
                { label: "Construtora", valor: clientesAtivos.find((c) => c.value === clienteValor)?.label },
                { label: "Tipo", valor: TIPOS_EMPREENDIMENTO.find((t) => t.value === tipoValor)?.label },
                {
                  label: "Torres",
                  valor: (form.watch("torres") ?? []).length > 0 ? `${(form.watch("torres") ?? []).length}` : undefined,
                },
                {
                  label: "Total de unidades",
                  valor:
                    (form.watch("torres") ?? []).reduce((s, t) => s + (Number(t.pavimentos) || 0) * (Number(t.unidadesPorPavimento) || 0), 0) || undefined,
                },
                {
                  label: "Tipologias",
                  valor: (form.watch("tipologias") ?? []).length > 0 ? `${(form.watch("tipologias") ?? []).length}` : undefined,
                },
                { label: "Período", valor: duracaoPrevistaMeses ? `${duracaoPrevistaMeses} meses` : undefined },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={item.valor ? "font-medium text-foreground" : "text-muted-foreground/50"}>
                    {item.valor ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <FormActionsBar
          salvando={salvando}
          isEdicao={isEdicao}
          etapaAtual={etapaAtual}
          totalEtapas={ETAPAS.length}
          ultimaEtapa={ultimaEtapa}
          camposPendentes={camposPendentes}
          onVoltar={() => setEtapaAtual((e) => Math.max(0, e - 1))}
          onContinuar={() => setEtapaAtual((e) => Math.min(ETAPAS.length - 1, e + 1))}
        />
      </form>
    </Form>
  );
}

/**
 * Barra de ações fixa no rodapé. Isolada em componente próprio para que
 * outras telas de formulário do ERP possam reaproveitar o mesmo padrão.
 */
function FormActionsBar({
  salvando,
  isEdicao,
  etapaAtual,
  totalEtapas,
  ultimaEtapa,
  camposPendentes,
  onVoltar,
  onContinuar,
}: {
  salvando: boolean;
  isEdicao: boolean;
  etapaAtual: number;
  totalEtapas: number;
  ultimaEtapa: boolean;
  camposPendentes: string[];
  onVoltar: () => void;
  onContinuar: () => void;
}) {
  const podeCriar = camposPendentes.length === 0;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:pl-60">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-4 sm:px-8">
        {ultimaEtapa && !podeCriar && (
          <p className="text-right text-xs font-medium text-warning">
            Faltam: {camposPendentes.join(", ")}.
          </p>
        )}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancelar
          </Button>
          {etapaAtual > 0 && (
            <Button type="button" variant="outline" onClick={onVoltar}>
              Voltar
            </Button>
          )}
          {!ultimaEtapa ? (
            <Button type="button" onClick={onContinuar}>
              Continuar ({etapaAtual + 1}/{totalEtapas})
            </Button>
          ) : (
            <Button type="submit" disabled={salvando || !podeCriar} title={!podeCriar ? `Faltam: ${camposPendentes.join(", ")}` : undefined}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdicao ? "Salvar alterações" : "Criar empreendimento"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
