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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface PersonOption {
  value: string;
  label: string;
  role?: string;
  initials: string;
}

interface PersonFormFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  options: PersonOption[];
}

/**
 * Campo de seleção de responsável com avatar. Reutilizável em qualquer
 * fluxo do ERP que exija atribuir uma pessoa da equipe a um registro.
 */
export function PersonFormField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Selecionar responsável",
  options,
}: PersonFormFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger className="h-12">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2.5 py-0.5">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {option.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex flex-col">
                      <span className="text-sm leading-tight">{option.label}</span>
                      {option.role && (
                        <span className="text-xs leading-tight text-muted-foreground">
                          {option.role}
                        </span>
                      )}
                    </span>
                  </span>
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
