// Pure pricing rules shared by the browser (preview) and the server (authoritative).
export type PricingProduct = {
  id: string;
  retail_price: number | null;
  wholesale_price: number | null;
  wholesale_min_qty: number;
  units_per_box: number;
  weight_kg: number | null;
};
export type DiscountTier = { product_id: string | null; min_qty: number; percent: number };
/** Fixed unit price from a quantity (units) onward, per product. */
export type PriceTier = { product_id: string; min_qty: number; unit_price: number };

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Priority: quantity price tier > wholesale (when min reached) > retail. null = price on request. */
export function basePrice(p: PricingProduct, qty: number, priceTiers: PriceTier[] = []) {
  const tier = priceTiers
    .filter((t) => t.product_id === p.id && qty >= t.min_qty)
    .sort((a, b) => b.min_qty - a.min_qty)[0];
  if (tier) return { price: Number(tier.unit_price), wholesale: true };
  const wholesale =
    p.wholesale_price != null && p.wholesale_min_qty > 0 && qty >= p.wholesale_min_qty;
  if (wholesale) return { price: Number(p.wholesale_price), wholesale: true };
  return { price: p.retail_price == null ? null : Number(p.retail_price), wholesale: false };
}

/** Product-specific tiers win over global tiers; the highest reached tier applies. */
export function discountFor(productId: string, qty: number, tiers: DiscountTier[]) {
  const own = tiers.filter((t) => t.product_id === productId);
  const pool = own.length ? own : tiers.filter((t) => t.product_id == null);
  let best = 0;
  let bestMin = -1;
  for (const t of pool) {
    if (qty >= t.min_qty && t.min_qty > bestMin) {
      best = Number(t.percent);
      bestMin = t.min_qty;
    }
  }
  return best;
}

export function nextTier(productId: string, qty: number, tiers: DiscountTier[]) {
  const own = tiers.filter((t) => t.product_id === productId);
  const pool = own.length ? own : tiers.filter((t) => t.product_id == null);
  return pool.filter((t) => t.min_qty > qty).sort((a, b) => a.min_qty - b.min_qty)[0] ?? null;
}

export function priceLine(p: PricingProduct, boxes: number, tiers: DiscountTier[], priceTiers: PriceTier[] = []) {
  const quantity = boxes * Math.max(1, p.units_per_box);
  const bp = basePrice(p, quantity, priceTiers);
  const priceOnRequest = bp.price == null;
  const price = bp.price ?? 0;
  const wholesale = bp.wholesale;
  const discountPercent = priceOnRequest ? 0 : discountFor(p.id, quantity, tiers);
  const unitPrice = round2(price * (1 - discountPercent / 100));
  const fullTotal = round2(price * quantity);
  const lineTotal = round2(unitPrice * quantity);
  return {
    priceOnRequest,
    quantity,
    boxes,
    basePrice: price,
    wholesale,
    discountPercent,
    unitPrice,
    lineTotal,
    discountValue: round2(fullTotal - lineTotal),
    retailTotal: p.retail_price == null ? null : round2(Number(p.retail_price) * quantity),
    weightKg: p.weight_kg != null ? round2(Number(p.weight_kg) * quantity * 1000) / 1000 : null,
  };
}

export function computeQuote(
  items: { productId: string; boxes: number }[],
  products: PricingProduct[],
  tiers: DiscountTier[],
  minOrderValue: number,
  priceTiers: PriceTier[] = [],
) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = items
    .filter((i) => byId.has(i.productId) && i.boxes > 0)
    .map((i) => ({ productId: i.productId, ...priceLine(byId.get(i.productId)!, i.boxes, tiers, priceTiers) }));
  const hasUnpriced = lines.some((l) => l.priceOnRequest);
  const total = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const discountTotal = round2(lines.reduce((s, l) => s + l.discountValue, 0));
  const weighted = lines.filter((l) => l.weightKg != null);
  return {
    lines,
    subtotal: round2(total + discountTotal),
    discountTotal,
    total,
    totalUnits: lines.reduce((s, l) => s + l.quantity, 0),
    totalBoxes: lines.reduce((s, l) => s + l.boxes, 0),
    totalWeightKg: weighted.length
      ? Math.round(weighted.reduce((s, l) => s + (l.weightKg ?? 0), 0) * 1000) / 1000
      : null,
    weightComplete: weighted.length === lines.length,
    minOrderValue,
    hasUnpriced,
    // Quotes with "price on request" items skip the minimum: the admin prices them manually.
    meetsMinimum: hasUnpriced || total >= minOrderValue,
    missingForMinimum: hasUnpriced ? 0 : round2(Math.max(0, minOrderValue - total)),
  };
}