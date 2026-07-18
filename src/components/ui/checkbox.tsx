"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Checkbox visual customizado sem dependência do Radix — usa um input[type=checkbox]
 * nativo escondido com um div estilizado sobreposto. API compatível com shadcn/ui
 * Checkbox (checked + onCheckedChange) para uso no React Hook Form.
 */
const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ id, checked, onCheckedChange, disabled, className, "aria-label": ariaLabel }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        id={id}
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "h-4 w-4 shrink-0 rounded border border-input bg-background transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked && "bg-primary border-primary",
          className
        )}
      >
        {checked && (
          <Check className="h-3 w-3 text-primary-foreground m-auto" strokeWidth={3} />
        )}
      </button>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
