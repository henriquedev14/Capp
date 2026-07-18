import { z } from "zod";

export const papelSchema = z.object({
  nome: z.string().min(2, "Informe o nome do papel"),
  descricao: z.string().optional(),
  permissoes: z.array(z.string()).min(1, "Selecione ao menos uma permissão"),
});

export type PapelFormValues = z.infer<typeof papelSchema>;
