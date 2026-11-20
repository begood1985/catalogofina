import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { catalogQuery } from "@/lib/catalog-query";
import { useCart } from "@/lib/cart";
import { computeQuote } from "@/lib/pricing";
import { money } from "@/lib/format";
import { quickQuoteLink } from "@/lib/quick-quote";
import { trackContact } from "@/lib/meta-pixel";

export function CartBar() {
  const { items } = useCart();
  const { data } = useQuery(catalogQuery);
  if (!data || items.length === 0) return null;
  const q = computeQuote(items, data.products, data.tiers, data.settings.min_order_value, data.priceTiers);
  const quickLink = quickQuoteLink(items, data.products, data.tiers, data.priceTiers);
  const pct = Math.min(100, q.minOrderValue ? (q.total / q.minOrderValue) * 100 : 100);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <div className="flex-1">
          <p className="text-sm"><b>{money(q.total)}</b> · {q.totalBoxes} caixa(s) · {q.totalUnits} un</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${q.meetsMinimum ? "bg-success" : "bg-accent"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {q.hasUnpriced ? "Inclui itens com preço sob consulta" : q.meetsMinimum ? "Pedido mínimo atingido" : `Faltam ${money(q.missingForMinimum)} para o pedido mínimo`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to="/carrinho" className="rounded-full bg-primary px-4 py-2.5 text-center text-xs font-semibold text-primary-foreground sm:text-sm">Ver orçamento</Link>
          {quickLink && (
            <a href={quickLink} target="_blank" rel="noopener noreferrer" onClick={() => trackContact("quick_quote")}
              className="rounded-full border border-emerald-700 px-4 py-2.5 text-center text-xs font-semibold text-emerald-800 sm:text-sm">
              Cotar no WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}