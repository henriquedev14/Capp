import { type LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * Card padrão para uma seção do formulário. Reutilizado em todas as
 * seções desta tela e em qualquer outro formulário do ERP que siga
 * o mesmo padrão visual (cliente, contrato, fornecedor, etc.).
 */
export function FormSection({
  icon: Icon,
  title,
  description,
  children,
  className,
  id,
}: FormSectionProps) {
  return (
    <Card id={id} className={cn("scroll-mt-6", className)}>
      <CardHeader className="flex-row items-start gap-3 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
          <Icon className="h-[18px] w-[18px] text-accent-foreground" strokeWidth={2} />
        </div>
        <div className="flex flex-col gap-0.5 pt-0.5">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">{children}</div>
      </CardContent>
    </Card>
  );
}
