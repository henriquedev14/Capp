"use client";

import { type Control, type FieldPath, type FieldValues } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DateField } from "@/components/ui/date-field";

interface DateFormFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  required?: boolean;
  colSpan?: "full" | "half";
}

export function DateFormField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  required,
  colSpan = "half",
}: DateFormFieldProps<TFieldValues>) {
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
            <DateField {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
