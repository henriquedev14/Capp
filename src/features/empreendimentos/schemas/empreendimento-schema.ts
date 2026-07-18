import { z } from "zod";

export const TIPOS_VALIDOS = [
  "RESIDENCIAL_VERTICAL",
  "RESIDENCIAL_HORIZONTAL",
  "COMERCIAL",
  "INDUSTRIAL",
  "INFRAESTRUTURA",
  "LOTEAMENTO",
] as const;

export const STATUS_VALIDOS = [
  "PROSPECCAO",
  "COMERCIAL",
  "ORCAMENTACAO",
  "CONTRATADO",
  "SUPRIMENTOS",
  "PRODUCAO",
  "CONCLUIDO",
  "ARQUIVADO",
] as const;

export const TIPOS_ESTRUTURA_VALIDOS = [
  "CONCRETO_ARMADO",
  "ALVENARIA_ESTRUTURAL",
  "PAREDE_DE_CONCRETO",
  "ESTRUTURA_METALICA",
  "STEEL_FRAME",
  "WOOD_FRAME",
] as const;

// Tipos de instalação do kit elétrico — catálogo base.
// O sistema permite adicionar mais tipos via configuração.
export const TIPOS_INSTALACAO_BASE = [
  "SOBRE_FORRO",
  "NA_LAJE",
  "DRYWALL",
  "PAREDE_DE_CONCRETO",
  "ALVENARIA",
] as const;

export type TipoInstalacao = typeof TIPOS_INSTALACAO_BASE[number] | string;

const torreSchema = z.object({
  nome: z.string().min(1, "Informe o nome da torre"),
  pavimentos: z.coerce
    .number({ invalid_type_error: "Informe um número" })
    .int("Use um número inteiro")
    .min(1, "Mínimo de 1 pavimento"),
  unidadesPorPavimento: z.coerce
    .number({ invalid_type_error: "Informe um número" })
    .int("Use um número inteiro")
    .min(1, "Mínimo de 1 unidade por pavimento"),
});

const tipologiaSchema = z.object({
  nome: z.string().min(1, "Informe o nome da tipologia"),
  areaPrivativa: z.coerce
    .number({ invalid_type_error: "Informe um número" })
    .positive("Área deve ser maior que zero")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // Quantidade de unidades desta tipologia no empreendimento — obrigatório,
  // é o dado que permite consolidar levantamento e orçamentação (totais
  // reais = levantamento por unidade × quantidade de unidades).
  quantidadeUnidades: z.coerce
    .number({ invalid_type_error: "Informe um número" })
    .int("Use um número inteiro")
    .min(1, "Mínimo de 1 unidade"),
  descricao: z.string().optional(),
});

export const empreendimentoSchema = z.object({
  // Informações Gerais — todos obrigatórios
  nome: z.string().min(3, "Informe o nome do empreendimento"),
  clienteId: z.string().min(1, "Selecione a construtora"),
  tipo: z
    .string()
    .min(1, "Selecione o tipo de empreendimento")
    .refine((v) => (TIPOS_VALIDOS as readonly string[]).includes(v), {
      message: "Tipo de empreendimento inválido",
    }),
  incorporadora: z.string().optional(),

  // Endereço
  cep: z.string().optional(),
  logradouro: z.string().min(3, "Informe o logradouro"),
  numero: z.string().optional(),
  cidade: z.string().min(2, "Informe a cidade"),
  estado: z.string().min(1, "Selecione o estado"),

  // Estrutura Técnica
  tipoEstrutura: z.string().min(1, "Selecione o tipo de estrutura"),
  kitEletrico: z.boolean().default(false),
  kitHidraulico: z.boolean().default(false),
  kitQdc: z.boolean().default(false),
  // Tipos de instalação do kit elétrico (multi-select)
  tiposInstalacao: z.array(z.string()).default([]),

  // Informações Comerciais
  // Tier serializado como string ("0".."3") por vir de um <Select>;
  // "" = sem classificação (herda do cliente na criação, via use case).
  tier: z
    .string()
    .optional()
    .refine((v) => !v || ["0", "1", "2", "3"].includes(v), {
      message: "Tier inválido",
    }),
  // Critério de precificação DESTE empreendimento — "" = usa o padrão
  // global (não escolheu nada específico pra essa obra).
  criterioPrecificacao: z
    .string()
    .optional()
    .refine((v) => !v || ["AREA", "PONTOS_TETO"].includes(v), {
      message: "Critério inválido",
    }),
  statusOportunidade: z.string().optional(),
  dataPrevistaInicio: z.string().optional(),
  dataPrevistaEntrega: z.string().optional(),

  // Responsáveis — preenchidos automaticamente ou no decorrer
  construtora: z.string().optional(),
  responsavelComercial: z.string().optional(),
  responsavelComercialEquipe: z.string().optional(),
  responsavelEngenharia: z.string().optional(),
  responsavelOrcamentacao: z.string().optional(),

  // Estrutura física
  temHall: z.boolean().default(false),
  hallTipo: z.enum(["TODOS", "ESPECIFICO"]).default("TODOS"),
  hallQuantidadeEspecifica: z.coerce
    .number({ invalid_type_error: "Informe um número" })
    .int("Use um número inteiro")
    .min(1, "Mínimo de 1 hall")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  torres: z.array(torreSchema).default([]),
  tipologias: z.array(tipologiaSchema).default([]),

  // Observações
  observacoes: z.string().optional(),
})
  // Regra de negócio: a soma das quantidades de unidades cadastradas nas
  // tipologias precisa bater exatamente com o total real de unidades do
  // empreendimento (torres × pavimentos × unidades por pavimento). Evita
  // que o consolidado do levantamento/orçamentação fique errado por
  // esquecimento de alguma tipologia ou digitação incorreta.
  .superRefine((data, ctx) => {
    const totalUnidadesReal = data.torres.reduce(
      (acc, t) => acc + t.pavimentos * t.unidadesPorPavimento,
      0
    );
    const totalTipologias = data.tipologias.reduce(
      (acc, t) => acc + (t.quantidadeUnidades || 0),
      0
    );

    // Só valida quando já existe estrutura física definida — evita travar
    // o cadastro no meio do preenchimento, antes das torres existirem.
    if (totalUnidadesReal > 0 && totalTipologias !== totalUnidadesReal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipologias"],
        message: `A soma das unidades por tipologia (${totalTipologias}) precisa ser igual ao total de unidades do empreendimento (${totalUnidadesReal}). Ajuste a quantidade de alguma tipologia.`,
      });
    }
  });

export type EmpreendimentoFormValues = z.infer<typeof empreendimentoSchema>;
export type TorreFormValues = z.infer<typeof torreSchema>;
export type TipologiaFormValues = z.infer<typeof tipologiaSchema>;
