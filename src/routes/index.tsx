import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, PackageOpen, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductCard } from "@/components/ProductCard";
import { CartBar } from "@/components/CartBar";
import { catalogQuery } from "@/lib/catalog-query";
import { money } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinaSub — Catálogo de insumos para sublimação" },
      { name: "description", content: "Busque por produto ou código, compare preços de varejo e atacado e monte seu orçamento." },
      { property: "og:title", content: "FinaSub — Catálogo de sublimação" },
      { property: "og:description", content: "Catálogo de insumos de sublimação no atacado com orçamento online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Catalog,
});

function Catalog() {
  const { data } = useSuspenseQuery(catalogQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const catName = useMemo(() => new Map(data.categories.map((c) => [c.id, c.name])), [data.categories]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.products.filter(
      (p) =>
        (cat === "all" || p.category_id === cat) &&
        (!term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.description.toLowerCase().includes(term)),
    );
  }, [data.products, q, cat]);

  const sections = useMemo(() => {
    const order = [...data.categories.map((c) => ({ id: c.id, name: c.name })), { id: "none", name: "Outros" }];
    return order
      .map((c) => ({ ...c, items: filtered.filter((p) => (p.category_id ?? "none") === c.id || (c.id === "none" && p.category_id != null && !catName.has(p.category_id))) }))
      .filter((c) => c.items.length);
  }, [filtered, data.categories, catName]);

  return (
    <div className="min-h-screen pb-28">
      <SiteHeader brand={data.settings.brand_name} />
      <section className="relative overflow-hidden bg-ink text-primary-foreground">
        <div className="absolute inset-0 dye-stripes" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-80">FinaSub · Orçamento para empresas e revendedores</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-extrabold leading-[1.05] md:text-6xl">
            Canecas para sublimação no atacado
          </h1>
          <p className="mt-4 max-w-2xl text-base opacity-90 md:text-lg">
            Compare o valor por caixa, escolha as quantidades e monte seu orçamento online.
            Valores de atacado e descontos são aplicados conforme a tabela de cada produto.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="#produtos" className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-sm hover:bg-white/90">
              Ver produtos e montar orçamento
            </a>
            <Link to="/carrinho" className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold hover:bg-white/10">
              Meu orçamento
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-primary-foreground/15 px-3 py-2">Pedido mínimo: {money(data.settings.min_order_value)}</span>
            <span className="rounded-full bg-primary-foreground/15 px-3 py-2">Quantidade por caixa em cada produto</span>
            <span className="rounded-full bg-primary-foreground/15 px-3 py-2">Atendimento pelo WhatsApp</span>
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
          <label className="relative flex-1 md:max-w-md md:min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou código (SKU)"
              aria-label="Buscar produto"
              className="h-11 w-full rounded-full border border-input bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 md:pb-0">
            {[{ id: "all", name: "Todos" }, ...data.categories].map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  cat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main id="produtos" className="mx-auto max-w-7xl scroll-mt-36 px-4 py-8">
        {data.offlineMode && (
          <div role="status" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <strong>Catálogo em demonstração.</strong> Fotos ilustrativas, produtos sob consulta e orçamentos temporariamente indisponíveis até a conexão com o banco de dados.
          </div>
        )}
        {data.products.length === 0 ? (
          <EmptyCatalog />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="font-semibold">Nenhum produto encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">Tente outro termo ou limpe o filtro de categoria.</p>
            <button className="mt-4 text-sm font-semibold text-primary underline" onClick={() => { setQ(""); setCat("all"); }}>Limpar filtros</button>
          </div>
        ) : (
          <div className="space-y-12">
            <p className="text-sm text-muted-foreground">{filtered.length} produto(s)</p>
            {sections.map((sec) => (
              <section key={sec.id} id={`cat-${sec.id}`} aria-labelledby={`h-${sec.id}`}>
                <div className="mb-4 flex items-baseline justify-between border-b border-border pb-2">
                  <h2 id={`h-${sec.id}`} className="text-2xl font-extrabold">{sec.name}</h2>
                  <span className="text-sm text-muted-foreground">{sec.items.length} item(ns)</span>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sec.items.map((p) => (
                    <ProductCard key={p.id} p={p} tiers={data.tiers} priceTiers={data.priceTiers} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <CartBar />
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm md:flex-row md:justify-between">
          <div>
            <p className="font-bold">{data.settings.brand_name} · Atendimento comercial</p>
            <p className="mt-1 text-muted-foreground">Escolha produtos, quantidades e solicite uma cotação pelo WhatsApp.</p>
            <p className="mt-1 text-muted-foreground">Entrega, frete e prazo são confirmados no atendimento conforme destino e pedido.</p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <a href="https://wa.me/554491881664?text=Ol%C3%A1%21%20Quero%20um%20or%C3%A7amento%20de%20canecas%20para%20sublima%C3%A7%C3%A3o." target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">
              Atendimento: +55 44 9188-1664
            </a>
            <p className="text-xs text-muted-foreground">Formas de pagamento: {data.settings.payment_methods.length ? data.settings.payment_methods.join(" · ") : "sob consulta"}</p>
            <Link to="/admin" className="text-xs text-muted-foreground underline">Área administrativa</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function EmptyCatalog() {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-border bg-card p-10 text-center shadow-card">
      <PackageOpen className="mx-auto h-12 w-12 text-accent" />
      <h2 className="mt-4 text-2xl font-bold">O catálogo ainda está vazio</h2>
      <p className="mt-2 text-muted-foreground">Nenhum produto foi cadastrado. Os itens aparecem aqui assim que a equipe importar ou criar produtos.</p>
      <ol className="mx-auto mt-6 max-w-md space-y-2 text-left text-sm">
        <li><b>1.</b> Entre na área administrativa (a primeira conta criada vira administradora).</li>
        <li><b>2.</b> Cadastre categorias e produtos, ou importe uma planilha CSV com dados autorizados.</li>
        <li><b>3.</b> Configure WhatsApp, pedido mínimo e faixas de desconto.</li>
      </ol>
      <Link to="/admin" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        <ShieldCheck className="h-4 w-4" /> Abrir área administrativa
      </Link>
    </div>
  );
}