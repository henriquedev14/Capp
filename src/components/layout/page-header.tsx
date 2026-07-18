import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface PageHeaderProps {
  breadcrumb: string[];
  title: React.ReactNode;
  description?: React.ReactNode;
}

// Mapa de nome de módulo → rota do hub daquele módulo. O primeiro item
// do breadcrumb vira link automático quando bate um desses nomes — sem
// precisar que cada página passe a rota manualmente. Antes, o breadcrumb
// inteiro era só texto (em TODAS as páginas do sistema), então voltar
// pro módulo exigia sempre usar o menu lateral de novo.
const ROTA_DO_MODULO: Record<string, string> = {
  "Produção": "/producao",
  "Suprimentos": "/suprimentos",
  "Financeiro": "/financeiro",
  "Empreendimentos": "/empreendimentos",
  "Fornecedores": "/fornecedores",
  "Clientes": "/clientes",
  "Analytics": "/painel",
  "Engenharia": "/painel",
};

/**
 * Cabeçalho padrão de página, reutilizável por qualquer módulo do ERP.
 * title e description aceitam string ou JSX.
 */
export function PageHeader({ breadcrumb, title, description }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {breadcrumb.map((item, index) => {
          const ehUltimo = index === breadcrumb.length - 1;
          const rota = ROTA_DO_MODULO[item];
          return (
            <span key={item} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              {!ehUltimo && rota ? (
                <Link href={rota} className="hover:text-foreground hover:underline">
                  {item}
                </Link>
              ) : (
                <span className={ehUltimo ? "text-foreground" : ""}>{item}</span>
              )}
            </span>
          );
        })}
      </nav>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5">
          {title}
        </h1>
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
    </div>
  );
}
