import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { catalogQuery } from "@/lib/catalog-query";
import { useCart } from "@/lib/cart";
import { computeQuote } from "@/lib/pricing";
import { money } from "@/lib/format";

export function CartBar() {
  const { items } = useCart();
  const { data } = useQuery(catalogQuery);
  if (!data || items.length === 0) return null;
  const q = computeQuote(items, data.products, data.tiers, data.settings.min_order_value, data.priceTiers);
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
        <Link to="/carrinho" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Ver orçamento</Link>
      </div>
    </div>
  );
}