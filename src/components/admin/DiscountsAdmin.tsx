import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInvalidate, useProducts } from "./useAdminData";

export function DiscountsAdmin() {
  const { data: products = [] } = useProducts();
  const invalidate = useInvalidate();
  const { data: tiers = [] } = useQuery({
    queryKey: ["admin", "tiers"],
    queryFn: async () => (await supabase.from("discount_tiers").select("*").order("min_qty")).data ?? [],
  });
  const [form, setForm] = useState({ product_id: "", min_qty: "", percent: "" });
  const name = new Map(products.map((p) => [p.id, `${p.sku} — ${p.name}`]));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const min = Number(form.min_qty), pct = Number(form.percent.replace(",", "."));
    if (!Number.isInteger(min) || min < 1) { toast.error("Quantidade mínima deve ser inteira ≥ 1"); return; }
    if (!(pct > 0 && pct < 100)) { toast.error("Desconto entre 0 e 100%"); return; }
    const { error } = await supabase.from("discount_tiers").insert({ product_id: form.product_id || null, min_qty: min, percent: pct });
    if (error) { toast.error(error.message); return; }
    setForm({ ...form, min_qty: "", percent: "" });
    invalidate();
  }
  async function del(id: string) {
    await supabase.from("discount_tiers").delete().eq("id", id);
    invalidate();
  }

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-muted-foreground">
        Faixas gerais valem para todos os produtos. Se um produto tiver faixas próprias, somente elas são usadas para ele. O desconto incide sobre o preço vigente (varejo ou atacado) pela quantidade de unidades do item.
      </p>
      <form onSubmit={add} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_140px_120px_auto] sm:items-end">
        <div className="space-y-1"><Label>Aplicar a</Label>
          <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Todos os produtos (geral)</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
          </select>
        </div>
        <div className="space-y-1"><Label>A partir de (un)</Label><Input type="number" min={1} value={form.min_qty} onChange={(e) => setForm({ ...form, min_qty: e.target.value })} /></div>
        <div className="space-y-1"><Label>Desconto %</Label><Input inputMode="decimal" value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} /></div>
        <Button type="submit">Adicionar</Button>
      </form>
      {tiers.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma faixa de desconto configurada.</p> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {tiers.map((t) => (
            <li key={t.id} className="flex items-center justify-between p-3 text-sm">
              <span><b>{t.product_id ? name.get(t.product_id) ?? "Produto removido" : "Geral"}</b> · a partir de {t.min_qty} un → <b className="text-accent">{Number(t.percent)}%</b></span>
              <Button size="icon" variant="ghost" onClick={() => del(t.id)} aria-label="Excluir"><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}