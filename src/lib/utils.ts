import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes condicionais e resolve conflitos do Tailwind.
 * Utilizado por todos os componentes de UI do projeto.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
