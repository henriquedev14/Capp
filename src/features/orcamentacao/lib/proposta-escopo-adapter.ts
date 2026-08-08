import type { PropostaInstitucionalData } from "@/features/orcamentacao/lib/renderizar-proposta";
import type { EscopoTemplate } from "@/features/orcamentacao/lib/motor-template-html";
import { obterAssetComoDataUri } from "@/features/orcamentacao/lib/template-proposta-runtime";

const NAVY = "#14213D";
const ORANGE = "#D9711E";
const NAO_INFORMADO = "Não informado";

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatNum(v: number): string {
  return v.toLocaleString("pt-BR");
}
function zebra<T extends Record<string, unknown>>(rows: T[]): (T & { bg: string })[] {
  return rows.map((r, i) => ({ ...r, bg: i % 2 === 0 ? "#FFFFFF" : "#F1EFEA" }));
}

// Conteúdo institucional fixo — mesmo texto de sempre, igual pra qualquer
// proposta (não vem do banco, é padrão da empresa).
// Conteúdo institucional fixo — mesmo texto de sempre, igual pra qualquer
// proposta (não vem do banco, é padrão da empresa). "O que será
// industrializado" (página 3) é sempre este conteúdo — não varia por
// projeto (correção de 16/07: antes vinha do Levantamento de Materiais,
// o que "desconfigurava" a página quando o projeto tinha poucos itens
// vinculados ao catálogo).
const TECH_GROUPS = [
  { n: "01", title: "Infraestrutura e Caixas", tagline: "Base pronta para receber a instalação", items: ["Caixa de teto multiposições (10 posições)", "Caixa SafeBox", "Caixas de parede 4x2 e 4x4"] },
  { n: "02", title: "Eletrodutos", tagline: "Infraestrutura compatível com o padrão da edificação", items: ["Corrugado reforçado PVC 25 mm", "Corrugado reforçado PVC 32 mm", "Fixação padronizada por pavimento"] },
  { n: "03", title: "Cabeamento Elétrico", tagline: "Cabos identificados, prontos para montagem", items: ["2,5 mm² — iluminação, tomadas e ar-condicionado", "6,0 mm² — chuveiro", "Identificação por cores conforme função"] },
  { n: "04", title: "Conectividade", tagline: "Conexões rápidas e seguras, sem emendas improvisadas", items: ["Conectores Wago de engate rápido", "2, 3 e 5 polos", "Padronização por unidade"] },
];

const PROCESSO_ETAPAS = [
  { n: "01", title: "Projetos", desc: "Consolidação dos projetos complementares recebidos." },
  { n: "02", title: "Engenharia", desc: "Detalhamento técnico dos kits por unidade." },
  { n: "03", title: "Industrialização", desc: "Montagem em ambiente fabril, fora do canteiro." },
  { n: "04", title: "Controle de qualidade", desc: "Verificação técnica de cada conjunto produzido." },
  { n: "05", title: "Expedição", desc: "Envio programado conforme cronograma de obra." },
];

const PROCESSO_BENEFICIOS = [
  { title: "Padronização", desc: "Mesmo padrão técnico repetido em todos os pavimentos." },
  { title: "Rastreabilidade", desc: "Cada kit identificado e vinculado à sua unidade." },
  { title: "Previsibilidade", desc: "Cronograma de obra menos sujeito a imprevistos." },
];

const PROXIMOS_PASSOS = [
  { n: "01", label: "Validação do escopo" },
  { n: "02", label: "Aprovação comercial" },
  { n: "03", label: "Consolidação dos projetos" },
  { n: "04", label: "Validação do padrão técnico" },
  { n: "05", label: "Programação da produção" },
  { n: "06", label: "Planejamento das remessas" },
];

const DEFAULT_INCLUIDOS = [
  "Kits elétricos das unidades habitacionais",
  "Kits dos halls efetivamente considerados",
  "Caixas, eletrodutos, cabos e conectores descritos",
  "Preparação e identificação dos conjuntos",
  "Industrialização em ambiente fabril",
  "Controle de qualidade",
];

const DEFAULT_EXCLUIDOS = [
  "Sistemas especiais das unidades",
  "Alimentadores e prumadas principais",
  "Escadarias e elevadores",
  "Acabamentos elétricos e sensores",
  "Instalações externas às unidades",
  "CFTV, incêndio, automação e sistemas equivalentes",
];

const TECH_PHOTOS_BASE = [
  { id: "tech-photo-1", label: "Foto — caixas e componentes", src: "foto-caixas.png" },
  { id: "tech-photo-2", label: "Foto — organização dos condutores", src: "foto-organizacao-condutores.png" },
  { id: "tech-photo-3", label: "Foto — conectores montados", src: "foto-conectores.png" },
];
function obterTechPhotos() {
  return TECH_PHOTOS_BASE.map((p) => ({ ...p, src: obterAssetComoDataUri(p.src) }));
}

/**
 * Traduz os dados já buscados do banco (PropostaInstitucionalData) pro
 * formato flat que o template.html oficial espera. Fica isolado num
 * arquivo próprio porque essa forma (nomes em inglês tipo `laborTotal`,
 * `techGroups`) é ditada pelo template — não é o vocabulário natural do
 * resto do sistema (que é em português).
 */
export function montarEscopoTemplate(data: PropostaInstitucionalData): EscopoTemplate {
  const materialBreakdown = data.anexoMateriais.grupos.map((g) => ({
    label: g.fabricante,
    value: formatBRL(g.subtotal),
    showBar: true,
    pct: data.anexoMateriais.totalGeral > 0 ? ((g.subtotal / data.anexoMateriais.totalGeral) * 100).toFixed(1) + "%" : "0%",
    weight: 600,
    textColor: "#3A3A3A",
    barMargin: "10px",
  }));
  materialBreakdown.push({
    label: "Total estimado",
    value: formatBRL(data.anexoMateriais.totalGeral),
    showBar: false,
    pct: "0%",
    weight: 700,
    textColor: NAVY,
    barMargin: "0px",
  });

  const gruposAnexoBrutos = data.anexoMateriais.grupos.map((g) => ({
    titulo: g.fabricante,
    tituloTabela: g.fabricante.toUpperCase(),
    subtotalLabel: `Subtotal ${g.fabricante}`,
    subtotalValor: formatBRL(g.subtotal),
    itens: zebra(
      g.itens.map((item) => ({
        desc: item.descricao,
        marca: item.marca,
        und: item.unidade,
        qty: formatNum(item.quantidade),
        unit: formatBRL(item.valorUnitario),
        total: formatBRL(item.valorTotal),
      }))
    ),
  }));

  // Agrupa vários fabricantes na MESMA página do anexo, até o orçamento
  // de linhas encher — antes era sempre 1 fabricante = 1 página inteira,
  // mesmo quando cabiam 3-4 juntos numa só. Pedido pelo Henrique em
  // 08/08/2026, mesmo padrão aplicado na Cotação Única no mesmo dia.
  //
  // Orçamento de linhas por página — recalculado em 08/08/2026 depois
  // de testar com dado real (Henrique reportou que quase nada estava
  // combinando). Página A4 tem ~995px úteis (1123 - padding), cada
  // grupo custa ~65px de cabeçalho/subtotal + ~24px por item — dá pra
  // caber uns 35-38 "unidades de linha" por página com folga. Usando
  // 25 (não 30) pra sobrar espaço pro gráfico de participação que
  // agora entra na primeira página também.
  const ORCAMENTO_LINHAS_POR_PAGINA = 25;
  const paginasAnexo: { grupos: typeof gruposAnexoBrutos }[] = [];
  let paginaAtual: typeof gruposAnexoBrutos = [];
  let linhasNaPagina = 0;

  for (const grupo of gruposAnexoBrutos) {
    const custoGrupo = grupo.itens.length + 2;
    if (paginaAtual.length > 0 && linhasNaPagina + custoGrupo > ORCAMENTO_LINHAS_POR_PAGINA) {
      paginasAnexo.push({ grupos: paginaAtual });
      paginaAtual = [];
      linhasNaPagina = 0;
    }
    paginaAtual.push(grupo);
    linhasNaPagina += custoGrupo;
  }
  if (paginaAtual.length > 0) paginasAnexo.push({ grupos: paginaAtual });
  const paginasAnexoComFlag = paginasAnexo.map((p, i) => ({
    ...p,
    ehUltima: i === paginasAnexo.length - 1,
    ehPrimeira: i === 0,
  }));

  const conditions = [
    "Faturamento dos materiais direto ao cliente",
    `Responsabilidade pelo frete: ${data.fretePor ?? NAO_INFORMADO}`,
    `Validade da proposta: ${data.validadeProposta ?? NAO_INFORMADO}`,
    "Início da produção mediante aprovação formal do escopo",
    "Alterações após aprovação geram revisão de quantitativos, prazos e valores",
  ];

  return {
    navy: NAVY,
    orange: ORANGE,

    clientName: data.cliente.nome,
    projectName: data.empreendimento.nome,
    location: `${data.empreendimento.cidade}-${data.empreendimento.estado}`,
    uhCount: data.empreendimento.unidadesHabitacionais
      ? `${data.empreendimento.unidadesHabitacionais} unidades habitacionais`
      : NAO_INFORMADO,
    headOpsName: data.associado.nome,

    navItems: [
      { n: "01", label: "Solução técnica" },
      { n: "02", label: "Processo de industrialização" },
      { n: "03", label: "Escopo" },
      { n: "04", label: "Investimento" },
    ],

    techGroups: TECH_GROUPS,
    techPhotos: obterTechPhotos(),

    processSteps: PROCESSO_ETAPAS,
    processBenefits: PROCESSO_BENEFICIOS,

    included: data.itensInclusos ?? DEFAULT_INCLUIDOS,
    excluded: data.itensExcluidos ?? DEFAULT_EXCLUIDOS,

    laborUnit: data.investimento.maoDeObraUnitario != null ? formatBRL(data.investimento.maoDeObraUnitario) : NAO_INFORMADO,
    laborTotal: formatBRL(data.investimento.maoDeObraTotal),
    materialUnit: data.investimento.materiaisUnitario != null ? formatBRL(data.investimento.materiaisUnitario) : NAO_INFORMADO,
    materialTotal: formatBRL(data.investimento.materiaisTotal),
    materialBreakdown,

    conditions,
    nextSteps: PROXIMOS_PASSOS,

    paginasAnexo: paginasAnexoComFlag,
    totalGeralMateriaisAnexo: formatBRL(data.anexoMateriais.totalGeral),
  };
}
