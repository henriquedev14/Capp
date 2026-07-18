"use client";

import * as React from "react";
import {
  useFieldArray,
  type Control,
  type UseFormSetValue,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";
import { Plus, Trash2, SlidersHorizontal, Building, DoorOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EmpreendimentoFormValues } from "@/features/empreendimentos/schemas/empreendimento-schema";

interface TorresFieldProps {
  control: Control<EmpreendimentoFormValues>;
  register: UseFormRegister<EmpreendimentoFormValues>;
  setValue: UseFormSetValue<EmpreendimentoFormValues>;
  watch: UseFormWatch<EmpreendimentoFormValues>;
  torresIniciais?: EmpreendimentoFormValues["torres"];
}

function todasTorresIguais(torres: EmpreendimentoFormValues["torres"]): boolean {
  if (torres.length <= 1) return true;
  const primeira = torres[0];
  if (!primeira) return true;
  return torres.every(
    (t) =>
      t.pavimentos === primeira.pavimentos &&
      t.unidadesPorPavimento === primeira.unidadesPorPavimento
  );
}

/**
 * Campo numérico que permite apagar durante a digitação mas valida no blur.
 * Nunca aceita valor < 1 ou não-inteiro ao sair do campo.
 */
function CampoNumerico({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  required?: boolean;
}) {
  const [raw, setRaw] = React.useState(String(value));
  const [erro, setErro] = React.useState<string | null>(null);

  // Sincroniza quando o valor externo muda
  React.useEffect(() => {
    setRaw(String(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRaw(e.target.value);
    setErro(null);
  }

  function handleBlur() {
    const parsed = parseInt(raw, 10);
    if (!raw.trim() || isNaN(parsed) || parsed < 1) {
      setErro("Mínimo: 1");
      setRaw(String(value)); // reverte para o valor válido anterior
      return;
    }
    setErro(null);
    onChange(parsed);
    setRaw(String(parsed));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">
        {label}{required && " *"}
      </label>
      <Input
        type="number"
        inputMode="numeric"
        value={raw}
        onChange={handleChange}
        onBlur={handleBlur}
        className={erro ? "border-destructive" : ""}
      />
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}

export function TorresField({
  control,
  register,
  setValue,
  watch,
  torresIniciais = [],
}: TorresFieldProps) {
  const [modoPersonalizado, setModoPersonalizado] = React.useState(
    () => torresIniciais.length > 0 && !todasTorresIguais(torresIniciais)
  );

  const [quantidadeTorres, setQuantidadeTorres] = React.useState(
    () => torresIniciais.length || 1
  );
  const [pavimentosPadrao, setPavimentosPadrao] = React.useState(
    () => torresIniciais[0]?.pavimentos ?? 1
  );
  const [unidadesPadrao, setUnidadesPadrao] = React.useState(
    () => torresIniciais[0]?.unidadesPorPavimento ?? 1
  );

  // Estado do Hall — registrado no formulário de verdade (antes era só
  // state local e nunca era salvo). "hallTipo" e "hallQuantidadeEspecifica"
  // viajam com o submit e são usados no servidor para calcular e
  // sincronizar a Tipologia sintética "Hall".
  const temHall = watch("temHall");
  const tipoHallValor = watch("hallTipo") ?? "TODOS";
  const qtdHallEspecificaValor = watch("hallQuantidadeEspecifica") ?? 1;
  const torresAtuais = watch("torres") ?? [];

  // Quantidade de halls calculada — soma os pavimentos de todas as
  // torres (funciona tanto no modo simples quanto no personalizado,
  // onde cada torre pode ter uma quantidade diferente de pavimentos).
  const totalHalls =
    tipoHallValor === "TODOS"
      ? torresAtuais.reduce((acc, t) => acc + (Number(t.pavimentos) || 0), 0)
      : Number(qtdHallEspecificaValor) || 1;

  const torresArray = useFieldArray({ control, name: "torres" });

  // Total de unidades calculado — soma pavimentos × unidades de cada
  // torre (funciona nos dois modos, já que o modo simples também
  // preenche `torres` via effect abaixo).
  const totalUnidades = torresAtuais.reduce(
    (acc, t) => acc + (Number(t.pavimentos) || 0) * (Number(t.unidadesPorPavimento) || 0),
    0
  );

  React.useEffect(() => {
    if (modoPersonalizado) return;
    const novasTorres = Array.from({ length: quantidadeTorres }, (_, i) => ({
      nome: `Torre ${i + 1}`,
      pavimentos: pavimentosPadrao,
      unidadesPorPavimento: unidadesPadrao,
    }));
    setValue("torres", novasTorres, { shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoPersonalizado, quantidadeTorres, pavimentosPadrao, unidadesPadrao]);

  function ativarModoPersonalizado() {
    if (torresArray.fields.length === 0) {
      const novasTorres = Array.from({ length: quantidadeTorres }, (_, i) => ({
        nome: `Torre ${i + 1}`,
        pavimentos: pavimentosPadrao,
        unidadesPorPavimento: unidadesPadrao,
      }));
      setValue("torres", novasTorres, { shouldValidate: false });
    }
    setModoPersonalizado(true);
  }

  return (
    <div className="flex flex-col gap-4 sm:col-span-2">
      {/* Torres */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Torres</span>
          {!modoPersonalizado ? (
            <Button type="button" variant="ghost" size="sm" onClick={ativarModoPersonalizado}
              className="h-7 text-xs text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Personalizar torres
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setModoPersonalizado(false)}
              className="h-7 text-xs text-muted-foreground">
              Usar mesmo padrão para todas
            </Button>
          )}
        </div>

        {torresAtuais.length > 0 && totalUnidades > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm">
            <Building className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-medium text-foreground">
              {torresAtuais.length} {torresAtuais.length === 1 ? "torre" : "torres"}
              {!modoPersonalizado && (
                <> × {pavimentosPadrao} pavimentos × {unidadesPadrao} unidades</>
              )}
              {" = "}
              <span className="text-primary">{totalUnidades} unidades</span>
            </span>
          </div>
        )}

        {!modoPersonalizado ? (
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Building className="h-3.5 w-3.5" />
              Todas as torres terão o mesmo número de pavimentos e unidades
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <CampoNumerico label="Quantidade de torres" value={quantidadeTorres}
                onChange={setQuantidadeTorres} required />
              <CampoNumerico label="Pavimentos por torre" value={pavimentosPadrao}
                onChange={setPavimentosPadrao} required />
              <CampoNumerico label="Unidades por pavimento" value={unidadesPadrao}
                onChange={setUnidadesPadrao} required />
            </div>
          </div>
        ) : (
          <>
            {torresArray.fields.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Nenhuma torre adicionada ainda.</p>
            )}
            {torresArray.fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium">Torre {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => torresArray.remove(index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Nome *</label>
                    <Input placeholder="Ex: Torre A" {...register(`torres.${index}.nome`)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Pavimentos *</label>
                    <Input type="number" min={1} inputMode="numeric" placeholder="Ex: 20"
                      {...register(`torres.${index}.pavimentos`)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Unidades por pavimento *</label>
                    <Input type="number" min={1} inputMode="numeric" placeholder="Ex: 4"
                      {...register(`torres.${index}.unidadesPorPavimento`)} />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline"
              onClick={() => torresArray.append({ nome: "", pavimentos: 1, unidadesPorPavimento: 1 })}>
              <Plus className="h-4 w-4" />
              Adicionar torre
            </Button>
          </>
        )}
      </div>

      {/* Hall — só aparece se temHall = true */}
      {temHall && (
        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Halls</span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoHallRadio"
                  checked={tipoHallValor === "TODOS"}
                  onChange={() => setValue("hallTipo", "TODOS", { shouldDirty: true })}
                  className="accent-primary"
                />
                <span className="text-sm">
                  Todos os halls (soma dos pavimentos de todas as torres)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoHallRadio"
                  checked={tipoHallValor === "ESPECIFICO"}
                  onChange={() => setValue("hallTipo", "ESPECIFICO", { shouldDirty: true })}
                  className="accent-primary"
                />
                <span className="text-sm">Quantidade específica</span>
              </label>
            </div>

            {tipoHallValor === "ESPECIFICO" && (
              <div className="w-48">
                <CampoNumerico
                  label="Quantidade de halls"
                  value={qtdHallEspecificaValor}
                  onChange={(v) => setValue("hallQuantidadeEspecifica", v, { shouldDirty: true })}
                  required
                />
              </div>
            )}

            {/* Resultado visível */}
            <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 w-fit">
              <DoorOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {totalHalls} {totalHalls === 1 ? "hall" : "halls"} no empreendimento
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              O Hall vira automaticamente uma tipologia própria, disponível para
              levantamento elétrico e hidráulico — não precisa cadastrá-lo na lista de
              tipologias abaixo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
