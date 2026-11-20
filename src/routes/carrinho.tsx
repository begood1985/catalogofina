import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { catalogQuery } from "@/lib/catalog-query";
import { quoteSchema, submitQuote } from "@/lib/catalog.functions";
import { useCart } from "@/lib/cart";
import { computeQuote } from "@/lib/pricing";
import { money, kg } from "@/lib/format";
import { getMetaConsent, META_CONSENT_EVENT, trackInitiateCheckout, trackLead } from "@/lib/meta-pixel";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Seu orçamento — FinaSub" },
      { name: "description", content: "Revise itens, quantidades e caixas e envie seu orçamento de insumos de sublimação." },
      { property: "og:title", content: "Seu orçamento — FinaSub" },
      { property: "og:description", content: "Revise e envie seu orçamento de sublimação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: CartPage,
});

function CartPage() {
  const { data } = useSuspenseQuery(catalogQuery);
  const { items, setBoxes, remove, clear } = useCart();
  const submit = useServerFn(submitQuote);
  const navigate = useNavigate();
  const [form, setForm] = useState({ customerName: "", whatsapp: "", document: "", paymentMethod: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  useEffect(() => {
    const sync = () => setMarketingConsent(getMetaConsent() === "granted");
    sync();
    window.addEventListener(META_CONSENT_EVENT, sync);
    return () => window.removeEventListener(META_CONSENT_EVENT, sync);
  }, []);

  const byId = new Map(data.products.map((p) => [p.id, p]));
  const valid = items.filter((i) => byId.has(i.productId));
  const q = computeQuote(valid, data.products, data.tiers, data.settings.min_order_value, data.priceTiers);
  const cartSignature = valid.map((item) => item.productId + ":" + item.boxes).sort().join("|");
  useEffect(() => {
    if (!marketingConsent || !cartSignature || data.offlineMode) return;
    trackInitiateCheckout(
      cartSignature,
      q.lines.map((line) => ({
        sku: byId.get(line.productId)?.sku ?? line.productId,
        quantity: line.quantity,
      })),
      q.hasUnpriced ? undefined : q.total,
    );
  }, [marketingConsent, cartSignature, data.offlineMode, q.lines, q.hasUnpriced, q.total, byId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (data.offlineMode) {
      toast.error("Orçamentos indisponíveis enquanto o catálogo estiver em demonstração.");
      return;
    }
    const payload = { ...form, document: form.document || undefined, notes: form.notes || undefined, items: valid };
    const parsed = quoteSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    if (!q.meetsMinimum) { toast.error(`Faltam ${money(q.missingForMinimum)} para o pedido mínimo.`); return; }
    setSending(true);
    try {
      const res = await submit({ data: parsed.data });
      // Orçamento só vira Lead depois da gravação confirmada; nunca é Purchase.
      trackLead(res.id, q.hasUnpriced ? undefined : q.total);
      await navigate({ to: "/orcamento/$id", params: { id: res.id } });
      clear();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar orçamento");
    } finally {
      setSending(false);
    }
  }

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value }),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader brand={data.settings.brand_name} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-extrabold md:text-4xl">Seu orçamento</h1>
        {data.offlineMode && <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Modo de demonstração: não envie pedidos por esta página. É necessário ativar a conexão com o Supabase.</p>}
        {valid.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">Nenhum item no orçamento</p>
            <p className="text-sm text-muted-foreground">Adicione produtos pelo catálogo para montar seu pedido.</p>
            <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Ir ao catálogo</Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px]">
            <section className="space-y-3">
              {q.lines.map((l) => {
                const p = byId.get(l.productId)!;
                return (
                  <div key={l.productId} className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                      <p className="font-semibold leading-tight">{p.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {l.quantity} un ({p.units_per_box}/cx) × {l.priceOnRequest ? "sob consulta" : money(l.unitPrice)}
                        {l.wholesale && " · atacado"}
                        {l.discountPercent > 0 && <span className="text-success"> · −{l.discountPercent}%</span>}
                        {l.weightKg != null && ` · ${kg(l.weightKg)}`}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs">Caixas</span>
                        <input type="number" min={1} value={l.boxes} onChange={(e) => setBoxes(p.id, Number(e.target.value))} className="h-8 w-20 rounded-md border border-input bg-background text-center text-sm" aria-label={`Caixas de ${p.name}`} />
                        <button onClick={() => remove(p.id)} className="ml-auto text-muted-foreground hover:text-destructive" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <p className="font-bold">{l.priceOnRequest ? <span className="text-sm text-muted-foreground">A cotar</span> : money(l.lineTotal)}</p>
                  </div>
                );
              })}
            </section>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <dl className="space-y-1.5 text-sm">
                  <Row label="Subtotal" value={money(q.subtotal)} />
                  {q.discountTotal > 0 && <Row label="Descontos" value={`− ${money(q.discountTotal)}`} />}
                  <Row label="Caixas" value={String(q.totalBoxes)} />
                  <Row label="Unidades" value={String(q.totalUnits)} />
                  {q.totalWeightKg != null && <Row label={q.weightComplete ? "Peso" : "Peso (parcial)"} value={kg(q.totalWeightKg)} />}
                </dl>
                <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                  <span className="font-semibold">Total estimado</span>
                  <span className="font-display text-2xl font-extrabold">{money(q.total)}</span>
                </div>
                {q.hasUnpriced && (
                  <p className="mt-3 rounded-lg bg-secondary p-3 text-sm">Alguns itens estão com <b>preço sob consulta</b>. O total acima considera só os itens com preço; a equipe enviará a cotação completa.</p>
                )}
                {!q.meetsMinimum && (
                  <p className="mt-3 rounded-lg bg-accent/15 p-3 text-sm">
                    Pedido mínimo de {money(q.minOrderValue)}. Faltam <b>{money(q.missingForMinimum)}</b>.
                  </p>
                )}
              </div>

              <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card" noValidate>
                <h2 className="text-lg font-bold">Finalize seu orçamento</h2>
                <p className="text-xs text-muted-foreground">Preencha os dados para registrar o pedido de orçamento e abrir o resumo no WhatsApp.</p>
                <F label="Nome ou razão social *" error={errors["customerName"]}><Input {...field("customerName")} maxLength={150} /></F>
                <F label="WhatsApp com DDD *" error={errors["whatsapp"]}><Input {...field("whatsapp")} inputMode="tel" placeholder="(11) 90000-0000" maxLength={20} /></F>
                <F label="CPF/CNPJ (opcional)" error={errors["document"]}><Input {...field("document")} inputMode="numeric" maxLength={20} /></F>
                <F label="Forma de pagamento *" error={errors["paymentMethod"]}>
                  <select {...field("paymentMethod")} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Selecione…</option>
                    {(data.settings.payment_methods.length ? data.settings.payment_methods : ["A combinar"]).map((m) => <option key={m}>{m}</option>)}
                  </select>
                </F>
                <F label="Observações" error={errors["notes"]}><Textarea {...field("notes")} maxLength={1000} rows={3} /></F>
                <Button type="submit" size="lg" className="w-full" disabled={sending || !q.meetsMinimum}>
                  {sending && <Loader2 className="animate-spin" />} Registrar e abrir WhatsApp
                </Button>
                <p className="text-center text-xs text-muted-foreground">Os valores são confirmados no envio conforme a tabela vigente.</p>
              </form>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>;
}
function F({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}