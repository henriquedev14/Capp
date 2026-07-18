"use client";

import { type Control, type FieldPath, type FieldValues } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface TextFormFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  required?: boolean;
  colSpan?: "full" | "half";
  type?: "text" | "email" | "tel";
  maxLength?: number;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
}

/**
 * Campo de texto padrão do formulário, já conectado ao React Hook Form.
 * Reutilizável em qualquer formulário do ERP que precise de um input simples.
 */
export function TextFormField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  required,
  colSpan = "half",
  type = "text",
  maxLength,
  inputMode,
}: TextFormFieldProps<TFieldValues>) {
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
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              maxLength={maxLength}
              inputMode={inputMode}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
