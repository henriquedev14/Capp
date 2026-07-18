"use client";

import { type Control, type FieldPath, type FieldValues } from "react-hook-form";

import {
  FormControl,
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

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFormFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  options: SelectOption[];
  required?: boolean;
  colSpan?: "full" | "half";
}

/**
 * Campo de seleção padrão do formulário, já conectado ao React Hook Form.
 * Reutilizável em qualquer formulário do ERP que precise de uma lista
 * de opções fixas (status, tipos, categorias, etc.).
 */
export function SelectFormField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Selecione",
  options,
  required,
  colSpan = "half",
}: SelectFormFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={colSpan === "full" ? "sm:col-span-2" : undefined}>
          <FormLabel>
            {label}
            {required && <span className="ml-0.5 text-primary">*</span>}
          </FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
