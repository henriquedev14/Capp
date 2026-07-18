import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const TEMPLATE_DIR = path.join(process.cwd(), "public", "propostas", "institucional");

const assetDataUriCache = new Map<string, string>();

/**
 * Devolve um asset (ex: foto de produto) já como data URI base64 —
 * usado pelos campos de template cujo `src` só existe DEPOIS da
 * resolução de `{{ }}` (ex: `techPhotos[].src`), então não passam pela
 * troca automática que `carregarTemplateBase` faz nos `src` literais do
 * HTML (como o da capa).
 */
export function obterAssetComoDataUri(nomeArquivo: string): string {
  const cacheado = assetDataUriCache.get(nomeArquivo);
  if (cacheado) return cacheado;

  const buffer = fs.readFileSync(path.join(TEMPLATE_DIR, "assets", nomeArquivo));
  const dataUri = `data:image/png;base64,${buffer.toString("base64")}`;
  assetDataUriCache.set(nomeArquivo, dataUri);
  return dataUri;
}

let templateBaseCache: string | null = null;

/**
 * Lê o template.html oficial (aprovado, não deve ter o layout alterado) e
 * embute as imagens estáticas como base64 — evita qualquer dependência de
 * caminho de arquivo/rede na hora de renderizar (o Chromium recebe o HTML
 * já 100% autocontido via `page.setContent`).
 *
 * Cache em memória: o arquivo não muda em runtime, só recarrega se o
 * processo reiniciar (deploy novo).
 */
function carregarTemplateBase(): string {
  if (templateBaseCache) return templateBaseCache;

  let html = fs.readFileSync(path.join(TEMPLATE_DIR, "template.html"), "utf-8");

  const assetsDir = path.join(TEMPLATE_DIR, "assets");
  for (const arquivo of fs.readdirSync(assetsDir)) {
    const caminhoRelativo = `assets/${arquivo}`;
    if (!html.includes(caminhoRelativo)) continue;
    const buffer = fs.readFileSync(path.join(assetsDir, arquivo));
    const dataUri = `data:image/png;base64,${buffer.toString("base64")}`;
    html = html.split(`"${caminhoRelativo}"`).join(`"${dataUri}"`);
  }

  templateBaseCache = html;
  return html;
}

/**
 * Renderiza um HTML já resolvido (sem mais {{ }}/<sc-for>) em PDF, usando
 * o Chromium instalado na imagem (via puppeteer-core — sem baixar
 * Chromium próprio, usa o do sistema operacional).
 */
export async function renderizarHtmlParaPdf(html: string): Promise<Buffer> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) {
    throw new Error(
      "PUPPETEER_EXECUTABLE_PATH não configurado — necessário pra gerar a Proposta Comercial (Chromium do sistema)."
    );
  }

  const browser = await puppeteer.launch({
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      width: "794px",
      height: "1123px",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export { carregarTemplateBase };
