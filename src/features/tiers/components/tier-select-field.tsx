"use client";

import { type Control, type FieldPath, type FieldValues } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIER_SELECT_OPTIONS } from "@/features/tiers/constants";

interface TierSelectFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  descricao?: string;
  colSpan?: "full" | "half";
}

/**
 * Select de Tier CONTROLADO (value, não defaultValue) — diferente do
 * SelectFormField genérico, este reflete na UI mudanças feitas via
 * form.setValue(). Isso é essencial no formulário de Empreendimento,
 * onde o tier é herdado automaticamente ao selecionar a construtora.
 */
export function TierSelectField<TFieldValues extends FieldValues>({
  control,
  name,
  label = "Tier",
  descricao,
  colSpan = "half",
}: TierSelectFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={colSpan === "full" ? "sm:col-span-2" : undefined}>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={field.onChange} value={field.value ?? ""}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Sem classificação" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {TIER_SELECT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {descricao && <FormDescription>{descricao}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
