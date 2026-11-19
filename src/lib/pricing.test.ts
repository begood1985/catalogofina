import { describe, expect, it } from "vitest";
import { computeQuote, priceLine, type PricingProduct } from "./pricing";

const p: PricingProduct = {
  id: "a",
  retail_price: 10,
  wholesale_price: 8,
  wholesale_min_qty: 50,
  units_per_box: 10,
  weight_kg: null,
};

describe("pricing", () => {
  it("uses retail price below the wholesale minimum", () => {
    expect(priceLine(p, 4, []).unitPrice).toBe(10);
  });
  it("uses wholesale price at the wholesale minimum", () => {
    expect(priceLine(p, 5, []).unitPrice).toBe(8);
  });
  it("product tiers override global tiers", () => {
    const tiers = [
      { product_id: null, min_qty: 10, percent: 20 },
      { product_id: "a", min_qty: 10, percent: 5 },
    ];
    expect(priceLine(p, 1, tiers).discountPercent).toBe(5);
  });
  it("applies the highest reached global tier", () => {
    const tiers = [
      { product_id: null, min_qty: 10, percent: 5 },
      { product_id: null, min_qty: 100, percent: 10 },
    ];
    expect(priceLine(p, 10, tiers).unitPrice).toBe(7.2);
  });
  it("blocks orders below the configured minimum (R$250 reference)", () => {
    const q = computeQuote([{ productId: "a", boxes: 2 }], [p], [], 250);
    expect(q.total).toBe(200);
    expect(q.meetsMinimum).toBe(false);
    expect(q.missingForMinimum).toBe(50);
  });
  it("omits weight when no product has weight registered", () => {
    expect(computeQuote([{ productId: "a", boxes: 1 }], [p], [], 0).totalWeightKg).toBeNull();
  });
  it("sums boxes and weight when registered", () => {
    const w = { ...p, id: "b", weight_kg: 0.5 };
    const q = computeQuote([{ productId: "b", boxes: 3 }], [w], [], 0);
    expect(q.totalBoxes).toBe(3);
    expect(q.totalWeightKg).toBe(15);
  });
});

describe("price on request and quantity price tiers", () => {
  const draft: PricingProduct = { id: "d", retail_price: null, wholesale_price: null, wholesale_min_qty: 0, units_per_box: 36, weight_kg: null };
  it("marks products without price as price on request", () => {
    const l = priceLine(draft, 1, []);
    expect(l.priceOnRequest).toBe(true);
    expect(l.lineTotal).toBe(0);
  });
  it("does not block the minimum when the quote has unpriced items", () => {
    expect(computeQuote([{ productId: "d", boxes: 1 }], [draft], [], 250).meetsMinimum).toBe(true);
  });
  it("quantity price tier overrides retail and wholesale", () => {
    const pt = [{ product_id: "a", min_qty: 100, unit_price: 7 }];
    expect(priceLine(p, 10, [], pt).unitPrice).toBe(7);
    expect(priceLine(p, 9, [], pt).unitPrice).toBe(8);
  });
});