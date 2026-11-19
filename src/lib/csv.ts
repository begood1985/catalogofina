export const CSV_COLUMNS = [
  "sku", "nome", "descricao", "categoria", "preco_varejo", "preco_atacado",
  "qtd_min_atacado", "unidades_caixa", "peso_kg", "estoque", "imagem_url", "ativo",
  "revisar", "ref_externa",
] as const;

export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

export function toCsv(rows: (string | number | null | undefined | boolean)[][]) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
}

/** Accepts "1.234,56", "1234.56", "12,5". Empty -> null. */
export function parseNum(v: string | undefined): number | null {
  const s = (v ?? "").trim().replace(/R\$\s?/i, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

export type ImportRow = {
  sku: string; name: string; description: string; category: string;
  retail_price: number | null; wholesale_price: number | null; wholesale_min_qty: number;
  units_per_box: number; weight_kg: number | null; stock: number | null;
  image_url: string | null; active: boolean;
  needs_review: boolean; external_ref: string | null;
};

export function validateRows(rows: string[][]): { valid: ImportRow[]; errors: string[] } {
  const [header, ...body] = rows;
  const errors: string[] = [];
  if (!header) return { valid: [], errors: ["Arquivo vazio"] };
  const idx = Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), i]));
  if (!("sku" in idx) && !("ref_externa" in idx)) errors.push("Informe a coluna sku ou ref_externa");
  for (const req of ["nome"]) if (!(req in idx)) errors.push(`Coluna obrigatória ausente: ${req}`);
  if (errors.length) return { valid: [], errors };
  const get = (r: string[], k: string) => (k in idx ? (r[idx[k]!] ?? "").trim() : "");
  const valid: ImportRow[] = [];
  const seen = new Set<string>();
  body.forEach((r, n) => {
    const line = n + 2;
    const sku = get(r, "sku");
    const ref = get(r, "ref_externa");
    const name = get(r, "nome");
    const retail = parseNum(get(r, "preco_varejo"));
    const wholesale = parseNum(get(r, "preco_atacado"));
    const minQty = parseNum(get(r, "qtd_min_atacado")) ?? 0;
    const perBox = parseNum(get(r, "unidades_caixa")) ?? 1;
    const weight = parseNum(get(r, "peso_kg"));
    const stock = parseNum(get(r, "estoque"));
    const img = get(r, "imagem_url");
    const problems: string[] = [];
    if (!sku && !ref) problems.push("informe sku ou ref_externa");
    if (sku.length > 60 || ref.length > 80) problems.push("SKU/referência muito longo");
    const key = sku ? `s:${sku.toLowerCase()}` : `r:${ref.toLowerCase()}`;
    if (seen.has(key)) problems.push("linha duplicada no arquivo");
    if (!name || name.length > 200) problems.push("nome inválido");
    if (retail != null && (Number.isNaN(retail) || retail < 0)) problems.push("preço de varejo inválido");
    if (wholesale != null && (Number.isNaN(wholesale) || wholesale < 0)) problems.push("preço de atacado inválido");
    if (Number.isNaN(minQty) || minQty < 0 || !Number.isInteger(minQty)) problems.push("qtd mínima atacado inválida");
    if (Number.isNaN(perBox) || perBox < 1 || !Number.isInteger(perBox)) problems.push("unidades por caixa inválida");
    if (weight != null && (Number.isNaN(weight) || weight < 0)) problems.push("peso inválido");
    if (stock != null && (Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock))) problems.push("estoque inválido");
    if (img && !/^https:\/\//i.test(img)) problems.push("imagem_url deve começar com https://");
    if (problems.length) { errors.push(`Linha ${line}: ${problems.join(", ")}`); return; }
    seen.add(key);
    const act = get(r, "ativo").toLowerCase();
    valid.push({
      sku, name, description: get(r, "descricao").slice(0, 2000), category: get(r, "categoria").slice(0, 80),
      retail_price: retail, wholesale_price: wholesale, wholesale_min_qty: minQty, units_per_box: perBox,
      weight_kg: weight, stock, image_url: img || null, active: !["0", "nao", "não", "false", "n"].includes(act),
      needs_review: ["1", "sim", "s", "true", "yes"].includes(get(r, "revisar").toLowerCase()),
      external_ref: ref || null,
    });
  });
  return { valid, errors };
}

/**
 * Idempotent merge plan: match by SKU, else by external reference, else create with a new
 * internal SKU. Re-importing the same file never creates duplicates.
 */
export function planImport(
  rows: ImportRow[],
  existing: { sku: string; external_ref: string | null }[],
  genSkus: (n: number) => string[],
) {
  const bySku = new Set(existing.map((e) => e.sku.toLowerCase()));
  const byRef = new Map(existing.filter((e) => e.external_ref).map((e) => [e.external_ref!.toLowerCase(), e.sku]));
  const needNew = rows.filter((r) => !r.sku && !(r.external_ref && byRef.has(r.external_ref.toLowerCase()))).length;
  const fresh = genSkus(needNew);
  let k = 0;
  let created = 0, updated = 0;
  const out = rows.map((r) => {
    const refSku = r.external_ref ? byRef.get(r.external_ref.toLowerCase()) : undefined;
    // an existing reference keeps its product's SKU, so the unique reference never collides
    const sku = refSku ?? (r.sku || fresh[k++]!);
    if (bySku.has(sku.toLowerCase())) updated++; else created++;
    return { ...r, sku };
  });
  return { rows: out, created, updated };
}