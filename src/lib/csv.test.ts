import { describe, expect, it } from "vitest";
import { parseCsv, planImport, validateRows } from "./csv";
import { nextInternalSku } from "./sku";

describe("csv import", () => {
  it("parses semicolon CSV with brazilian decimals", () => {
    const rows = parseCsv("sku;nome;preco_varejo;preco_atacado\nA1;\"Papel; A4\";12,50;10,00\n");
    const { valid, errors } = validateRows(rows);
    expect(errors).toEqual([]);
    expect(valid[0]).toMatchObject({ sku: "A1", name: "Papel; A4", retail_price: 12.5, wholesale_price: 10 });
  });
  it("accepts rows without price (sob consulta)", () => {
    const { valid } = validateRows(parseCsv("ref_externa,nome,preco_varejo\nX1,Caneca,\n"));
    expect(valid[0]?.retail_price).toBeNull();
  });
  it("rejects rows without sku and reference", () => {
    const { valid, errors } = validateRows(parseCsv("sku,ref_externa,nome\n,,Caneca\n"));
    expect(valid).toHaveLength(0);
    expect(errors[0]).toContain("Linha 2");
  });
  it("re-importing the same reference updates instead of duplicating", () => {
    const { valid } = validateRows(parseCsv("ref_externa,nome\nX1,Caneca\nX2,Xícara\n"));
    const plan = planImport(valid, [{ sku: "FS-00007", external_ref: "X1" }], (n) => nextInternalSku(["FS-00007"], n));
    expect(plan.rows.map((r) => r.sku)).toEqual(["FS-00007", "FS-00008"]);
    expect(plan.updated).toBe(1);
    expect(plan.created).toBe(1);
  });
});