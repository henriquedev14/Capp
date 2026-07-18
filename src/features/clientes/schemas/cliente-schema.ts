import { z } from "zod";

/** Remove tudo que não for dígito numérico */
function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Valida CNPJ brasileiro: exatamente 14 dígitos.
 * Aceita com ou sem máscara (XX.XXX.XXX/XXXX-XX ou 00000000000000).
 */
const cnpjSchema = z
  .string()
  .min(1, "Informe o CNPJ")
  .transform(apenasDigitos)
  .refine((v) => v.length === 14, {
    message: "CNPJ deve ter exatamente 14 dígitos",
  });

/**
 * Valida telefone brasileiro com DDD:
 * - Fixo: 10 dígitos (DDD + 8 dígitos)   ex: (34) 3215-0000
 * - Celular: 11 dígitos (DDD + 9 + 8)    ex: (34) 9 9999-0000
 * Aceita com ou sem formatação.
 */
const telefoneSchema = z
  .string()
  .optional()
  .transform((v) => (v ? apenasDigitos(v) : v))
  .refine(
    (v) => !v || v.length === 10 || v.length === 11,
    { message: "Telefone deve ter 10 dígitos (fixo) ou 11 dígitos (celular com 9º dígito)" }
  );

/**
 * Valida CEP brasileiro: exatamente 8 dígitos.
 * Aceita com ou sem hífen (XXXXX-XXX ou 00000000).
 */
const cepSchema = z
  .string()
  .optional()
  .transform((v) => (v ? apenasDigitos(v) : v))
  .refine(
    (v) => !v || v.length === 8,
    { message: "CEP deve ter exatamente 8 dígitos" }
  );

const contatoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(2, "Informe o nome do contato"),
  cargo: z.string().optional(),
  telefone: telefoneSchema,
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  principal: z.boolean().default(false),
});

export const clienteSchema = z.object({
  razaoSocial: z.string().min(3, "Informe a razão social"),
  nomeFantasia: z.string().optional(),
  cnpj: cnpjSchema,
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone: telefoneSchema,
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: cepSchema,
  // Tier serializado como string ("0".."3") porque vem de um <Select>;
  // a action converte para número antes de persistir. "" = sem classificação.
  tier: z
    .string()
    .optional()
    .refine((v) => !v || ["0", "1", "2", "3"].includes(v), {
      message: "Tier inválido",
    }),
  contatos: z.array(contatoSchema).default([]),
});

export type ClienteFormValues = z.infer<typeof clienteSchema>;
export type ContatoFormValues = z.infer<typeof contatoSchema>;
