import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";
import { useInvalidate } from "./useAdminData";

export function PriceTiersEditor({ productId }: { productId: string }) {
  const invalidate = useInvalidate();
  const { data: tiers = [] } = useQuery({
    queryKey: ["admin", "price-tiers", productId],
    queryFn: async () => (await supabase.from("price_tiers").select("*").eq("product_id", productId).order("min_qty")).data ?? [],
  });
  const [minQty, setMinQty] = useState("");
  const [price, setPrice] = useState("");

  async function add() {
    const q = Number(minQty), pr = Number(price.replace(",", "."));
    if (!Number.isInteger(q) || q < 1) { toast.error("Quantidade inteira ≥ 1"); return; }
    if (!Number.isFinite(pr) || pr < 0 || price.trim() === "") { toast.error("Preço inválido"); return; }
    const { error } = await supabase.from("price_tiers").upsert({ product_id: productId, min_qty: q, unit_price: pr }, { onConflict: "product_id,min_qty" });
    if (error) { toast.error(error.message); return; }
    setMinQty(""); setPrice("");
    invalidate();
  }
  async function del(id: string) {
    await supabase.from("price_tiers").delete().eq("id", id);
    invalidate();
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-sm font-semibold">Preço por faixa de quantidade</p>
      <p className="text-xs text-muted-foreground">Preço unitário a partir de X unidades. Tem prioridade sobre varejo e atacado.</p>
      {tiers.length > 0 && (
        <ul className="divide-y divide-border text-sm">
          {tiers.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-1">
              <span>a partir de <b>{t.min_qty}</b> un → <b>{money(t.unit_price)}</b>/un</span>
              <Button size="icon" variant="ghost" onClick={() => del(t.id)} aria-label="Remover faixa"><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input type="number" min={1} placeholder="A partir de (un)" value={minQty} onChange={(e) => setMinQty(e.target.value)} />
        <Input inputMode="decimal" placeholder="R$ / un" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Button type="button" variant="outline" onClick={add}>Adicionar</Button>
      </div>
    </div>
  );
}