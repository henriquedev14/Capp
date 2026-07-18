import { prisma } from "@/infra/db/prisma/client";

/**
 * Seed do catálogo de materiais PEX — Linha Barbi do Brasil
 * Fonte: https://www.barbidobrasil.com.br/produtos/linha-tubos-conexoes-pex/
 *
 * Diâmetros disponíveis na linha Barbi: 16mm, 20mm, 25mm, 32mm, 40mm
 * (diâmetros maiores via consulta técnica)
 */

const DIAMETROS = ["16mm", "20mm", "25mm", "32mm", "40mm"];
const FABRICANTE = "Barbi";

interface MaterialInput {
  fabricante?: string;
  categoria: string;
  nome: string;
  diametro?: string;
  unidade?: string;
  obs?: string;
}

// Gera variações de diâmetro para um produto
function porDiametro(categoria: string, nome: string, diametros = DIAMETROS, obs?: string): MaterialInput[] {
  return diametros.map((d) => ({ categoria, nome, diametro: d, obs }));
}

// Gera variações de redução (ex: 20x16mm)
function reducoes(categoria: string, nome: string, obs?: string): MaterialInput[] {
  const result: MaterialInput[] = [];
  for (let i = 0; i < DIAMETROS.length; i++) {
    for (let j = 0; j < DIAMETROS.length; j++) {
      if (i !== j) {
        result.push({ categoria, nome, diametro: `${DIAMETROS[i]}x${DIAMETROS[j]}`, obs });
      }
    }
  }
  return result;
}

const materiais: MaterialInput[] = [
  // ── TUBOS ──────────────────────────────────────────────────────────────────
  ...["16mm", "20mm", "25mm", "32mm", "40mm"].map((d) => ({
    categoria: "Tubo",
    nome: `Tubo PEX Série 5 Flexio — Rolo`,
    diametro: d,
    unidade: "m",
    obs: `Rolo: 16mm=240m, 20mm=200m, 25mm=100m, 32mm=50m, 40mm=50m`,
  })),
  ...["16mm", "20mm", "25mm", "32mm", "40mm"].map((d) => ({
    categoria: "Tubo",
    nome: `Tubo PEX Série 5 Flexio — Barra 5m`,
    diametro: d,
    unidade: "m",
    obs: "Barras de 5m",
  })),

  // ── CONEXÕES — COTOVELO ────────────────────────────────────────────────────
  ...porDiametro("Conexão - Cotovelo", "Cotovelo 90°"),
  ...porDiametro("Conexão - Cotovelo", "Cotovelo 90° com Rosca Fêmea"),
  ...porDiametro("Conexão - Cotovelo", "Cotovelo 90° com Rosca Fêmea Móvel"),
  ...porDiametro("Conexão - Cotovelo", "Cotovelo 90° com Rosca Macho"),
  ...porDiametro("Conexão - Cotovelo", "Cotovelo 90° Removível Reforçado com Rosca Fêmea Curta"),
  ...porDiametro("Conexão - Cotovelo", "Cotovelo 90° Removível Reforçado com Rosca Fêmea Longa"),
  ...porDiametro("Conexão - Cotovelo", "Cotovelo 90° Rosca Fêmea Curta com Base para Fixação e Isolante"),
  ...porDiametro("Conexão - Cotovelo", "Cotovelo 90° Rosca Fêmea Longa com Base para Fixação e Isolante"),

  // ── CONEXÕES — TE ──────────────────────────────────────────────────────────
  ...porDiametro("Conexão - Te", "Te Normal"),
  ...porDiametro("Conexão - Te", "Te com Rosca Central Fêmea"),
  ...porDiametro("Conexão - Te", "Te com Rosca Central Macho"),
  ...porDiametro("Conexão - Te", "Te Misturador com Base para Fixação e Isolante"),
  // Tes de redução — combinações de diâmetros
  ...["16mm", "20mm", "25mm", "32mm"].flatMap((d1) =>
    ["16mm", "20mm", "25mm", "32mm"].filter((d2) => d2 !== d1).map((d2) => ({
      categoria: "Conexão - Te",
      nome: "Te Redução Central",
      diametro: `${d1}x${d2}`,
    }))
  ),
  ...["16mm", "20mm", "25mm", "32mm"].flatMap((d1) =>
    ["16mm", "20mm", "25mm", "32mm"].filter((d2) => d2 !== d1).map((d2) => ({
      categoria: "Conexão - Te",
      nome: "Te Redução Extrema",
      diametro: `${d1}x${d2}`,
    }))
  ),
  ...["16mm", "20mm", "25mm", "32mm"].flatMap((d1) =>
    ["16mm", "20mm", "25mm", "32mm"].filter((d2) => d2 !== d1).map((d2) => ({
      categoria: "Conexão - Te",
      nome: "Te Redução Lateral",
      diametro: `${d1}x${d2}`,
    }))
  ),
  ...["16mm", "20mm", "25mm"].flatMap((d1) =>
    ["16mm", "20mm", "25mm"].filter((d2) => d2 !== d1).map((d2) => ({
      categoria: "Conexão - Te",
      nome: "Te Redução Extrema e Central",
      diametro: `${d1}x${d2}`,
    }))
  ),

  // ── CONEXÕES — LUVA ───────────────────────────────────────────────────────
  ...porDiametro("Conexão - Luva", "Luva Normal"),
  ...porDiametro("Conexão - Luva", "Luva com Rosca Macho/Fêmea"),
  ...porDiametro("Conexão - Luva", "Luva com Rosca Fêmea/Fêmea"),
  ...["16mm", "20mm", "25mm", "32mm"].flatMap((d1) =>
    ["16mm", "20mm", "25mm", "32mm"].filter((d2) => d2 !== d1).map((d2) => ({
      categoria: "Conexão - Luva",
      nome: "Luva de Redução",
      diametro: `${d1}x${d2}`,
    }))
  ),

  // ── CONEXÕES — CONECTOR ────────────────────────────────────────────────────
  ...porDiametro("Conexão - Conector", "Conector Fixo com Rosca Fêmea"),
  ...porDiametro("Conexão - Conector", "Conector Fixo com Rosca Macho"),
  ...porDiametro("Conexão - Conector", "Conector Longo com Rosca Fêmea Móvel"),
  ...porDiametro("Conexão - Conector", "Conector Curto com Rosca Fêmea Móvel"),

  // ── CONEXÕES — ADAPTADOR ───────────────────────────────────────────────────
  ...porDiametro("Conexão - Adaptador", "Anel"),
  ...porDiametro("Conexão - Adaptador", "Adaptador Cobre Solda PEX"),
  ...porDiametro("Conexão - Adaptador", "Bucha de Redução Macho/Fêmea"),
  ...porDiametro("Conexão - Adaptador", "Niple Macho/Macho"),
  ...["16mm", "20mm", "25mm", "32mm"].flatMap((d1) =>
    ["16mm", "20mm", "25mm", "32mm"].filter((d2) => d2 !== d1).map((d2) => ({
      categoria: "Conexão - Adaptador",
      nome: "Niple de Redução Macho/Macho",
      diametro: `${d1}x${d2}`,
    }))
  ),
  { categoria: "Conexão - Adaptador", nome: "Misturador Tipo Ducha", diametro: "1/2\"" },
  { categoria: "Conexão - Adaptador", nome: "Misturador Tipo Ducha", diametro: "3/4\"" },

  // ── CONEXÕES — TAMPÃO ──────────────────────────────────────────────────────
  ...porDiametro("Conexão - Tampão", "Tampão Fêmea"),
  ...porDiametro("Conexão - Tampão", "Tampão Macho"),

  // ── CONEXÕES — DISTRIBUIDOR ────────────────────────────────────────────────
  { categoria: "Conexão - Distribuidor", nome: "Distribuidor Aberto com Tetina e Fixação DSLB234", diametro: "20mm", obs: "2 saídas de 3/4\"" },
  { categoria: "Conexão - Distribuidor", nome: "Distribuidor Aberto com Tetina e Fixação DSLB334", diametro: "25mm", obs: "3 saídas de 3/4\"" },
  ...["16mm", "20mm", "25mm"].map((d) => ({ categoria: "Conexão - Distribuidor", nome: "Distribuidor com Rosca", diametro: d })),
  ...["20mm", "25mm"].map((d) => ({ categoria: "Conexão - Distribuidor", nome: "Distribuidor com Válvula e Fixação", diametro: d })),
  { categoria: "Conexão - Distribuidor", nome: "Distribuidor Fechado com Tetina e Fixação", diametro: "25mm" },
  { categoria: "Conexão - Distribuidor", nome: "Distribuidor Tipo Cruzeta", diametro: "20mm" },
  { categoria: "Conexão - Distribuidor", nome: "Distribuidor Tipo Cruzeta Dupla", diametro: "20mm" },

  // ── VÁLVULAS / REGISTROS ───────────────────────────────────────────────────
  ...["1/2\"", "3/4\"", "1\""].map((d) => ({ categoria: "Válvula", nome: "Válvula Esférica", diametro: d })),
  { categoria: "Válvula", nome: "Válvula Esférica Angular com Tetina", diametro: "20mm" },
  ...["16mm", "20mm"].map((d) => ({ categoria: "Válvula", nome: "Registro de Pressão PEX", diametro: d })),
  { categoria: "Válvula", nome: "Válvula Mini Especial", diametro: "1/2\"" },
  // MVS por fabricante de metais
  ...["Deca", "Docol", "Fabrimar"].flatMap((fab) =>
    ["1/2\"", "3/4\""].map((d) => ({
      categoria: "Válvula",
      nome: `MVS Barbi Padrão ${fab}`,
      diametro: d,
      obs: `Para metais ${fab}`,
    }))
  ),

  // ── COMPONENTES PARA KITS ──────────────────────────────────────────────────
  { categoria: "Componente Kit", nome: "Coifa Simples" },
  { categoria: "Componente Kit", nome: "Coifa Dupla" },
  { categoria: "Componente Kit", nome: "Coifa Tripla" },
  { categoria: "Componente Kit", nome: "Coifa Quadrupla" },
  { categoria: "Componente Kit", nome: "Coifa Silicone" },
  { categoria: "Componente Kit", nome: "Tampa de Inspeção" },
  { categoria: "Componente Kit", nome: "Tampa de Inspeção Ventilada Vertical" },
  { categoria: "Componente Kit", nome: "Tampa de Inspeção Horizontal" },
  { categoria: "Componente Kit", nome: "Grelha Ventilada" },
  { categoria: "Componente Kit", nome: "Te Ducha Higiênica" },
  { categoria: "Componente Kit", nome: "Ponto de Filtro" },
  { categoria: "Componente Kit", nome: "Conjunto Capa Cromada" },
  { categoria: "Componente Kit", nome: "Abraçadeira Sextavada Tipo M" },

  // ── QUADROS HIDRÁULICOS ────────────────────────────────────────────────────
  { categoria: "Quadro Hidráulico", nome: "Quadro Chuveiro de Sobrepor 2 Travessas" },
  { categoria: "Quadro Hidráulico", nome: "Quadro Chuveiro de Embutir 2 Travessas" },
  { categoria: "Quadro Hidráulico", nome: "Quadro Aquecedor de Sobrepor 2 Travessas" },
  { categoria: "Quadro Hidráulico", nome: "Quadro Aquecedor de Embutir 2 Travessas" },
  { categoria: "Quadro Hidráulico", nome: "Quadro Chuveiro de Sobrepor 3 Travessas" },
  { categoria: "Quadro Hidráulico", nome: "Quadro Aquecedor de Sobrepor 3 Travessas" },
  { categoria: "Quadro Hidráulico", nome: "Quadro Aquecedor de Embutir 3 Travessas" },

  // ── CHASSI METÁLICO ────────────────────────────────────────────────────────
  { categoria: "Chassi Metálico", nome: "Chassi Tanque" },
  { categoria: "Chassi Metálico", nome: "Chassi Tanque Reduzido" },
  { categoria: "Chassi Metálico", nome: "Chassi Lavatório/WC" },
  { categoria: "Chassi Metálico", nome: "Chassi Cuba Simples/Churrasqueira" },
  { categoria: "Chassi Metálico", nome: "Chassi Cuba Dupla Opção 1" },
  { categoria: "Chassi Metálico", nome: "Chassi Cuba Dupla Opção 2" },

  // ── CARENAGEM PLÁSTICA ─────────────────────────────────────────────────────
  { categoria: "Carenagem Plástica", nome: "Carenagem Tanque" },
  { categoria: "Carenagem Plástica", nome: "Carenagem Tanque Reduzido" },
  { categoria: "Carenagem Plástica", nome: "Carenagem Lavatório/WC" },
  { categoria: "Carenagem Plástica", nome: "Carenagem Cuba Simples/Churrasqueira" },
  { categoria: "Carenagem Plástica", nome: "Carenagem Cuba Dupla Opção 1" },
  { categoria: "Carenagem Plástica", nome: "Carenagem Cuba Dupla Opção 2" },
  { categoria: "Carenagem Plástica", nome: "Carenagem Dobrada" },

  // ── TRAVESSAS ──────────────────────────────────────────────────────────────
  { categoria: "Travessa", nome: "Travessa para Registro de Pressão" },
  { categoria: "Travessa", nome: "Travessa para Monocomando" },
  { categoria: "Travessa", nome: "Travessa Tubular para Cotovelo" },
  { categoria: "Travessa", nome: "Travessa para Distribuidor" },
  { categoria: "Travessa", nome: "Travessa para Aquecedor e Tanque" },
  { categoria: "Travessa", nome: "Travessa para Registro de Gaveta" },
];

export async function seedMateriaisPex() {
  const total = materiais.length;
  console.log(`[seed:pex] Inserindo ${total} materiais PEX Barbi...`);

  let inseridos = 0;
  for (const m of materiais) {
    const existing = await prisma.materialPex.findFirst({
      where: {
        fabricante: m.fabricante ?? FABRICANTE,
        nome: m.nome,
        diametro: m.diametro ?? null,
      },
    });
    if (!existing) {
      await prisma.materialPex.create({
        data: {
          fabricante: m.fabricante ?? FABRICANTE,
          categoria: m.categoria,
          nome: m.nome,
          diametro: m.diametro ?? null,
          unidade: m.unidade ?? "un",
          obs: m.obs ?? null,
        },
      });
      inseridos++;
    }
  }

  console.log(`[seed:pex] ${inseridos} materiais inseridos (${total - inseridos} já existiam).`);
}
