"use client";

import * as React from "react";
import {
  type LucideIcon,
  Building2,
  Briefcase,
  Users,
  NotebookPen,
  FolderOpen,
  Layers,
} from "lucide-react";

import { cn } from "@/lib/utils";

export interface FormSectionNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const DEFAULT_ITEMS: FormSectionNavItem[] = [
  { id: "informacoes-gerais", label: "Informações gerais", icon: Building2 },
  { id: "estrutura-fisica", label: "Estrutura física", icon: Layers },
  { id: "informacoes-comerciais", label: "Informações comerciais", icon: Briefcase },
  { id: "responsaveis", label: "Responsáveis", icon: Users },
  { id: "observacoes", label: "Observações", icon: NotebookPen },
  { id: "documentos", label: "Documentos", icon: FolderOpen },
];

interface FormSectionNavProps {
  items?: FormSectionNavItem[];
}

export function FormSectionNav({ items = DEFAULT_ITEMS }: FormSectionNavProps) {
  const [activeId, setActiveId] = React.useState(items[0]?.id);

  React.useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  function handleClick(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item.id)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
