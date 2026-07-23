/**
 * Motor de template mínimo pro HTML oficial da Proposta Comercial — resolve
 * `{{ caminho.pontilhado }}`, `<sc-for list="{{ arr }}" as="nome">` (com
 * aninhamento) e `<sc-if value="{{ expr }}">`. Sem dependências externas.
 *
 * Escolha deliberada de não usar uma lib de template genérica (Handlebars,
 * Mustache etc.) — o HTML oficial já vem com essa sintaxe própria (exportada
 * de uma ferramenta de design), então o motor replica exatamente essa
 * sintaxe em vez de forçar tudo pra outra convenção.
 */

export type EscopoTemplate = Record<string, unknown>;

/**
 * Escapa caracteres especiais de HTML — Tarefa 1.2.4 (achado de
 * segurança da auditoria). Sem isso, um nome de cliente/observação
 * contendo `<script>`, `<img onerror=...>` etc. seria inserido cru no
 * HTML que o Chromium renderiza antes de virar PDF — o Chromium executa
 * JavaScript normalmente nesse processo, então isso não é só "quebra
 * visual", é injeção de verdade.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPath(scope: EscopoTemplate, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, scope);
}

function findMatchingClose(html: string, openTag: string, closeTag: string, searchFrom: number): number {
  let depth = 1;
  let i = searchFrom;
  while (depth > 0) {
    const nextOpen = html.indexOf(openTag, i);
    const nextClose = html.indexOf(closeTag, i);
    if (nextClose === -1) throw new Error(`Tag de fechamento "${closeTag}" não encontrada no template.`);
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + openTag.length;
    } else {
      depth--;
      i = nextClose + closeTag.length;
      if (depth === 0) return nextClose;
    }
  }
  throw new Error("Não deveria chegar aqui — profundidade de tags inconsistente.");
}

export function renderTemplateHtml(html: string, scope: EscopoTemplate): string {
  // 1) <sc-if value="{{ expr }}" ...> ... </sc-if>
  const ifOpenRe = /<sc-if\s+value="\{\{\s*([^}]+?)\s*\}\}"[^>]*>/;
  while (true) {
    const m = ifOpenRe.exec(html);
    if (!m) break;
    const openEnd = m.index + m[0]!.length;
    const closeIdx = findMatchingClose(html, "<sc-if", "</sc-if>", openEnd);
    const inner = html.slice(openEnd, closeIdx);
    const condVal = getPath(scope, m[1]!.trim());
    const replacement = condVal ? renderTemplateHtml(inner, scope) : "";
    html = html.slice(0, m.index) + replacement + html.slice(closeIdx + "</sc-if>".length);
  }

  // 2) <sc-for list="{{ arr }}" as="nome" ...> ... </sc-for> (aninhado)
  const forOpenRe = /<sc-for\s+list="\{\{\s*([^}]+?)\s*\}\}"\s+as="([^"]+)"[^>]*>/;
  while (true) {
    const m = forOpenRe.exec(html);
    if (!m) break;
    const openEnd = m.index + m[0]!.length;
    const closeIdx = findMatchingClose(html, "<sc-for", "</sc-for>", openEnd);
    const inner = html.slice(openEnd, closeIdx);
    const listPath = m[1]!.trim();
    const asName = m[2]!.trim();
    const list = (getPath(scope, listPath) as unknown[] | undefined) ?? [];
    const rendered = list.map((item) => renderTemplateHtml(inner, { ...scope, [asName]: item })).join("");
    html = html.slice(0, m.index) + rendered + html.slice(closeIdx + "</sc-for>".length);
  }

  // 3) {{ caminho }} simples restante
  html = html.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path: string) => {
    path = path.trim();
    if (path === "true") return "true";
    const val = getPath(scope, path);
    return val === undefined || val === null ? "" : escapeHtml(String(val));
  });

  return html;
}
