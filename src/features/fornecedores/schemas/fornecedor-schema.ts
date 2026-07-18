import { z } from "zod";

/** Remove tudo que não for dígito numérico */
function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

const cnpjSchema = z
  .string()
  .min(1, "Informe o CNPJ")
  .transform(apenasDigitos)
  .refine((v) => v.length === 14, { message: "CNPJ deve ter exatamente 14 dígitos" });

const telefoneSchema = z
  .string()
  .optional()
  .transform((v) => (v ? apenasDigitos(v) : v))
  .refine((v) => !v || v.length === 10 || v.length === 11, {
    message: "Telefone deve ter 10 dígitos (fixo) ou 11 (celular com 9º dígito)",
  });

const cepSchema = z
  .string()
  .optional()
  .transform((v) => (v ? apenasDigitos(v) : v))
  .refine((v) => !v || v.length === 8, { message: "CEP deve ter exatamente 8 dígitos" });

const contatoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(2, "Informe o nome do contato"),
  cargo: z.string().optional(),
  telefone: telefoneSchema,
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  principal: z.boolean().default(false),
});

export const TIPOS_FORNECEDOR = [
  { value: "ELETRODUTOS", label: "Eletrodutos e conexões" },
  { value: "CABOS", label: "Cabos e fios elétricos" },
  { value: "QUADROS", label: "Quadros, disjuntores e cubículos" },
  { value: "LUMINARIAS", label: "Luminárias e drivers LED" },
  { value: "TOMADAS_INTERRUPTORES", label: "Tomadas e interruptores" },
  { value: "MATERIAIS_HIDRAULICOS", label: "Materiais hidráulicos" },
  { value: "MATERIAIS_CIVIS", label: "Materiais civis (massa, rejunte, cola)" },
  { value: "FERRAMENTAS", label: "Ferramentas e equipamentos" },
  { value: "SERVICOS", label: "Serviços terceirizados" },
  { value: "OUTROS", label: "Outros" },
] as const;

export const TIPO_FORNECEDOR_VALUES = TIPOS_FORNECEDOR.map((t) => t.value) as [
  string,
  ...string[]
];

export const fornecedorSchema = z.object({
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
  observacoes: z.string().optional(),
  // Tipos como array de strings — checkboxes no formulário
  tipos: z
    .array(z.enum(TIPO_FORNECEDOR_VALUES as [string, ...string[]]))
    .min(1, "Selecione ao menos um tipo de fornecimento"),
  contatos: z.array(contatoSchema).default([]),
});

export type FornecedorFormValues = z.infer<typeof fornecedorSchema>;
export type ContatoFornecedorFormValues = z.infer<typeof contatoSchema>;
