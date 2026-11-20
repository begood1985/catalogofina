import { whatsappUrl } from "@/lib/whatsapp";
import { money } from "@/lib/format";
import type { CatalogProduct } from "@/lib/catalog.functions";
import type { DiscountTier, PriceTier } from "@/lib/pricing";
import { computeQuote } from "@/lib/pricing";

type CartLine = { productId: string; boxes: number };

/** Solicitação de cotação via conversa, independente do registro formal.
 * Não marca o pedido como gravado nem como venda. */
export function quickQuoteLink(
  items: CartLine[],
  products: CatalogProduct[],
  tiers: DiscountTier[],
  priceTiers: PriceTier[],
  name?: string,
): string | null {
  const selected = items.filter((item) => item.boxes > 0 && products.some((p) => p.id === item.productId));
  if (!selected.length) return null;
  const quote = computeQuote(selected, products, tiers, 0, priceTiers);
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines = quote.lines.map((line) => {
    const product = byId.get(line.productId);
    const amount = line.priceOnRequest ? "valor a cotar" : money(line.lineTotal) + " (estimativa)";
    return "- " + (product?.name || "Produto") + " (" + (product?.sku || "") + "): " +
      line.boxes + " cx / " + line.quantity + " un — " + amount;
  });
  const message = [
    "Olá! Quero uma *cotação de canecas para sublimação* na FinaSub.",
    name?.trim() ? "Cliente: " + name.trim().slice(0, 150) : null,
    "",
    ...lines,
    "",
    "Total: " + quote.totalBoxes + " caixas, " + quote.totalUnits + " unidades.",
    quote.hasUnpriced ? "Há itens sem preço definido; aguardo cotação." : "Subtotal estimado: " + money(quote.total),
    "Favor confirmar preço final, disponibilidade, frete e prazo.",
    "Mensagem enviada pelo catálogo; *não é orçamento registrado*.",
  ].filter((line): line is string => line !== null).join("\n");
  return whatsappUrl(message);
}
