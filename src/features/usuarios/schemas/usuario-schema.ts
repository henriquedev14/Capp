import { z } from "zod";
import { validarSenhaForte } from "@/core/auth/validar-senha";

function refinarSenhaForte(senha: string) {
  const r = validarSenhaForte(senha);
  return r.valida;
}

export const usuarioSchema = z.object({
  nome: z.string().min(3, "Informe o nome completo"),
  email: z.string().email("E-mail inválido"),
  // Senha só é obrigatória na criação — no form de edição o campo some e
  // a troca de senha é feita por uma ação separada (redefinirSenha).
  senha: z
    .string()
    .min(8, "Mínimo de 8 caracteres")
    .refine(refinarSenhaForte, "Precisa ter maiúscula, minúscula e número")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  papeisIds: z.array(z.string()).min(1, "Selecione ao menos um papel"),
});

export type UsuarioFormValues = z.infer<typeof usuarioSchema>;

export const redefinirSenhaSchema = z.object({
  novaSenha: z
    .string()
    .min(8, "Mínimo de 8 caracteres")
    .refine(refinarSenhaForte, "Precisa ter maiúscula, minúscula e número"),
});

export type RedefinirSenhaFormValues = z.infer<typeof redefinirSenhaSchema>;
