import * as React from "react";
import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DateFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Campo de data nativo com estilo consistente ao restante do formulário.
 * Mantém o stack obrigatório sem adicionar bibliotecas de calendário extras.
 */
const DateField = React.forwardRef<HTMLInputElement, DateFieldProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="date"
          ref={ref}
          className={cn(
            "tabular flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm shadow-card-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
DateField.displayName = "DateField";

export { DateField };
