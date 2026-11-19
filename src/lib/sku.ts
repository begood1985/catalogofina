/** Internal FinaSub SKU: FS-00001. Never reuse a supplier/competitor code as SKU. */
export function nextInternalSku(existing: string[], count = 1): string[] {
  let max = 0;
  for (const s of existing) {
    const m = /^FS-(\d+)$/i.exec(s.trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return Array.from({ length: count }, (_, i) => `FS-${String(max + i + 1).padStart(5, "0")}`);
}