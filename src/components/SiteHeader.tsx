import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";

export function SiteHeader({ brand = "FinaSub" }: { brand?: string }) {
  const { count } = useCart();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/brand/finasub-logo.svg" alt="FinaSub" className="h-12 w-[132px] object-contain object-left md:w-[160px]" />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/" className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-semibold" }} activeOptions={{ exact: true }}>
            Catálogo
          </Link>
          <Link to="/carrinho" className="relative flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Orçamento</span>
            {count > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs text-accent-foreground">{count}</span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}