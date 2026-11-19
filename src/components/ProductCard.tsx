import { Minus, Plus, Package } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { money, kg } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { nextTier, priceLine, type DiscountTier, type PriceTier } from "@/lib/pricing";
import type { CatalogProduct } from "@/lib/catalog.functions";
import { productSlug, referencePhotos } from "@/lib/reference-photos";

const illustrationPath = (name: string) => "/catalogo/ilustracoes/" + productSlug(name) + ".svg";

function ProductImage({ name, url }: { name: string; url: string | null }) {
  // Use the registered product photo when it loads; fall back to a local
  // illustration when the photo is missing, blocked or returns 404.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [illustrationFailed, setIllustrationFailed] = useState(false);
  const reference = referencePhotos[productSlug(name)];
  const preferredUrl = url || reference?.url || null;
  const remoteUrl = preferredUrl && failedUrl !== preferredUrl ? preferredUrl : null;
  const illustration = illustrationPath(name);
  return (
    <div className="relative h-full w-full">
      {remoteUrl ? (
        <>
          <img
            key={remoteUrl}
            src={remoteUrl}
            alt={reference && !url ? `Fotografia de referência: ${name}` : name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain p-2"
            onError={() => setFailedUrl(remoteUrl)}
          />
          {reference && !url && (
            <a href={reference.source} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 rounded bg-white/95 px-2 py-1 text-[10px] text-slate-700 underline">
              {reference.approx ? "Foto de referência · fonte" : "Foto do modelo · fonte"}
            </a>
          )}
        </>
      ) : (
        <>
          {illustrationFailed ? (
            <div className="flex h-full items-center justify-center bg-slate-50 text-slate-400" role="img" aria-label={`Produto: ${name}`}>
              <Package className="h-16 w-16" />
            </div>
          ) : (
            <img
              key={illustration}
              src={illustration}
              alt={`Ilustração de ${name}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain p-2"
              onError={() => setIllustrationFailed(true)}
            />
          )}
          <span className="absolute bottom-2 right-2 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-600">
            Imagem ilustrativa
          </span>
        </>
      )}
    </div>
  );
}

export function ProductCard({ p, tiers, priceTiers = [], category }: { p: CatalogProduct; tiers: DiscountTier[]; priceTiers?: PriceTier[]; category?: string | undefined }) {
  const { items, setBoxes } = useCart();
  const boxes = items.find((i) => i.productId === p.id)?.boxes ?? 0;
  const line = priceLine(p, Math.max(boxes, 1), tiers, priceTiers);
  const myTiers = priceTiers.filter((t) => t.product_id === p.id);
  const onRequest = p.retail_price == null && p.wholesale_price == null && myTiers.length === 0;
  const next = nextTier(p.id, line.quantity, tiers);
  const out = p.stock === 0;
  const maxBoxes = p.stock != null ? Math.floor(p.stock / p.units_per_box) : 100000;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-transform hover:-translate-y-0.5">
      <div className="relative aspect-square bg-muted">
        <ProductImage name={p.name} url={p.image_url} />
        <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-1 font-mono text-[11px] font-semibold">{p.sku}</span>
        {p.needs_review && <span className="absolute bottom-3 left-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">Em revisão</span>}
        {out && <span className="absolute right-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-semibold text-destructive-foreground">Sem estoque</span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          {category && <p className="text-xs font-semibold uppercase tracking-wider text-accent">{category}</p>}
          <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug">{p.name}</h3>
        </div>
        {onRequest ? (
          <div className="rounded-lg border border-dashed border-primary/40 bg-secondary/50 px-3 py-2.5 text-sm">
            <p className="font-bold text-secondary-foreground">Preço sob consulta</p>
            <p className="text-xs text-muted-foreground">Adicione ao orçamento e receba a cotação.</p>
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-muted px-3 py-2">
            <p className="text-[11px] uppercase text-muted-foreground">Varejo</p>
            <p className="font-bold">{p.retail_price != null ? money(p.retail_price) : "Consulte"}</p>
          </div>
          <div className="rounded-lg bg-secondary px-3 py-2">
            <p className="text-[11px] uppercase text-secondary-foreground/70">
              Atacado{p.wholesale_min_qty > 0 ? ` ≥${p.wholesale_min_qty}` : ""}
            </p>
            <p className="font-bold text-secondary-foreground">{p.wholesale_price != null ? money(p.wholesale_price) : "—"}</p>
          </div>
        </div>
        )}
        {myTiers.length > 0 && (
          <ul className="space-y-0.5 rounded-lg bg-muted px-3 py-2 text-xs">
            {myTiers.map((t) => <li key={t.min_qty} className="flex justify-between"><span>a partir de {t.min_qty} un</span><b>{money(t.unit_price)}/un</b></li>)}
          </ul>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" />{p.units_per_box} un/caixa</span>
          {p.weight_kg != null && <span>{kg(p.weight_kg)}/un</span>}
          {p.stock != null && p.stock > 0 && <span>{p.stock} em estoque</span>}
        </div>
        {next && (
          <p className="rounded-md border border-dashed border-accent/60 px-2 py-1 text-xs">
            A partir de <b>{next.min_qty} un</b>: <b className="text-accent">{next.percent}% off</b>
          </p>
        )}
        <div className="mt-auto space-y-2 pt-1">
          {boxes > 0 && line.priceOnRequest && <p className="text-xs text-muted-foreground">{line.quantity} un · preço a confirmar</p>}
          {boxes > 0 && !line.priceOnRequest && (
            <p className="text-xs text-muted-foreground">
              {line.quantity} un × {money(line.unitPrice)}
              {line.discountPercent > 0 && <span className="text-success"> (−{line.discountPercent}%)</span>} ={" "}
              <b className="text-foreground">{money(line.lineTotal)}</b>
            </p>
          )}
          {boxes === 0 ? (
            <Button className="w-full" disabled={out} onClick={() => setBoxes(p.id, 1)}>
              {onRequest ? "Solicitar orçamento" : "Adicionar ao orçamento"}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" aria-label="Menos uma caixa" onClick={() => setBoxes(p.id, boxes - 1)}><Minus /></Button>
              <label className="flex-1">
                <span className="sr-only">Caixas</span>
                <input
                  type="number"
                  min={0}
                  max={maxBoxes}
                  value={boxes}
                  onChange={(e) => setBoxes(p.id, Math.min(maxBoxes, Number(e.target.value)))}
                  className="h-9 w-full rounded-md border border-input bg-background text-center font-semibold"
                />
              </label>
              <Button size="icon" variant="outline" aria-label="Mais uma caixa" disabled={boxes >= maxBoxes} onClick={() => setBoxes(p.id, boxes + 1)}><Plus /></Button>
            </div>
          )}
          {boxes > 0 && <p className="text-center text-[11px] text-muted-foreground">{boxes} {boxes === 1 ? "caixa" : "caixas"}</p>}
        </div>
      </div>
    </article>
  );
}