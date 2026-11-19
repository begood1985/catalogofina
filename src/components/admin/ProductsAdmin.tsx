import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { productSlug, referencePhotos } from "@/lib/reference-photos";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { money } from "@/lib/format";
import { useCategories, useInvalidate, useProducts } from "./useAdminData";
import { PriceTiersEditor } from "./PriceTiersEditor";
import { nextInternalSku } from "@/lib/sku";

type Product = Tables<"products">;
const optNum = z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))), z.number().min(0).nullable());
const schema = z.object({
  sku: z.string().trim().min(1, "SKU obrigatório").max(60),
  name: z.string().trim().min(1, "Nome obrigatório").max(200),
  description: z.string().trim().max(2000),
  category_id: z.string().nullable(),
  retail_price: optNum,
  wholesale_price: optNum,
  wholesale_min_qty: z.coerce.number().int().min(0),
  units_per_box: z.coerce.number().int().min(1, "Mínimo 1"),
  weight_kg: optNum,
  stock: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).nullable()),
  image_url: z.string().trim().max(2000).nullable(),
  active: z.boolean(),
  needs_review: z.boolean(),
  external_ref: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(80).nullable()),
});
type Form = Record<keyof z.infer<typeof schema>, any>;
const empty: Form = { sku: "", name: "", description: "", category_id: null, retail_price: "", wholesale_price: "", wholesale_min_qty: 0, units_per_box: 1, weight_kg: "", stock: "", image_url: null, active: true, needs_review: false, external_ref: "" };

export function ProductsAdmin() {
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const invalidate = useInvalidate();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const [uploading, setUploading] = useState(false);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const [onlyReview, setOnlyReview] = useState(false);
  const reviewCount = products.filter((p) => p.needs_review).length;
  const list = products.filter((p) => (!onlyReview || p.needs_review)).filter((p) => !q || (p.external_ref ?? "").toLowerCase().includes(q.toLowerCase()) || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()));

  const open = (p?: Product) =>
    setEditing({
      id: p?.id ?? null,
      form: p
        ? { ...p, retail_price: p.retail_price ?? "", wholesale_price: p.wholesale_price ?? "", weight_kg: p.weight_kg ?? "", stock: p.stock ?? "", external_ref: p.external_ref ?? "" }
        : { ...empty, sku: nextInternalSku(products.map((x) => x.sku))[0] },
    });

  async function save() {
    if (!editing) return;
    const parsed = schema.safeParse(editing.form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    const row = { ...parsed.data, updated_at: new Date().toISOString() };
    const { error } = editing.id
      ? await supabase.from("products").update(row).eq("id", editing.id)
      : await supabase.from("products").insert(row);
    if (error) { toast.error(error.code === "23505" ? "Já existe um produto com esse SKU ou referência externa" : error.message); return; }
    toast.success("Produto salvo");
    setEditing(null);
    invalidate();
  }

  async function del(p: Product) {
    if (!confirm(`Excluir ${p.sku} — ${p.name}?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    invalidate();
  }

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Envie um arquivo de imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem acima de 5 MB"); return; }
    setUploading(true);
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase() ?? "jpg"}`;
    const { error } = await supabase.storage.from("product-media").upload(path, file, { contentType: file.type });
    if (error) { setUploading(false); toast.error(error.message); return; }
    const { data, error: e2 } = await supabase.storage.from("product-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    setUploading(false);
    if (e2 || !data) { toast.error("Falha ao gerar link da imagem"); return; }
    setEditing((cur) => (cur ? { ...cur, form: { ...cur.form, image_url: data.signedUrl } } : cur));
  }

  const f = editing?.form;
  const suggestedPhoto = f ? referencePhotos[productSlug(f.name)] : undefined;
  const set = (k: keyof Form, v: unknown) => setEditing((cur) => (cur ? { ...cur, form: { ...cur.form, [k]: v } } : cur));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Buscar por nome ou SKU" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Button onClick={() => open()}><Plus /> Novo produto</Button>
        <span className="text-sm text-muted-foreground">{products.length} cadastrado(s)</span>
        {reviewCount > 0 && (
          <label className="flex items-center gap-2 text-sm"><Switch checked={onlyReview} onCheckedChange={setOnlyReview} /> Só em revisão ({reviewCount})</label>
        )}
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum produto. Crie manualmente ou use a aba <b>Importar/Exportar</b> com uma planilha de dados autorizados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Produto</th><th className="p-3">Categoria</th><th className="p-3">Varejo</th><th className="p-3">Atacado</th><th className="p-3">Cx</th><th className="p-3">Estoque</th><th className="p-3">Status</th><th /></tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3"><div className="flex items-center gap-3">
                    <AdminPhoto name={p.name} url={p.image_url} small />
                    <div><p className="font-mono text-xs text-muted-foreground">{p.sku}{p.external_ref && <span className="ml-2 opacity-70">ref. ext.: {p.external_ref}</span>}</p><p className="font-medium">{p.name}</p>{p.needs_review && <span className="text-xs font-semibold text-accent">Rascunho / verificar</span>}</div>
                  </div></td>
                  <td className="p-3">{p.category_id ? catName.get(p.category_id) : "—"}</td>
                  <td className="p-3">{p.retail_price != null ? money(p.retail_price) : <span className="text-muted-foreground">Sob consulta</span>}</td>
                  <td className="p-3">{p.wholesale_price != null ? `${money(p.wholesale_price)} (≥${p.wholesale_min_qty})` : "—"}</td>
                  <td className="p-3">{p.units_per_box}</td>
                  <td className="p-3">{p.stock ?? "—"}</td>
                  <td className="p-3">{p.active ? <span className="text-success">Ativo</span> : <span className="text-muted-foreground">Oculto</span>}</td>
                  <td className="p-3"><div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => open(p)} aria-label="Editar"><Pencil /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del(p)} aria-label="Excluir"><Trash2 /></Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          {f && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Fld label="SKU interno FinaSub *"><Input value={f.sku} onChange={(e) => set("sku", e.target.value)} /></Fld>
              <Fld label="Referência externa temporária (não exibida ao público)"><Input value={f.external_ref} onChange={(e) => set("external_ref", e.target.value)} /></Fld>
              <Fld label="Categoria">
                <select value={f.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Sem categoria</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Fld>
              <Fld label="Nome *" wide><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Fld>
              <Fld label="Descrição" wide><Textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} /></Fld>
              <Fld label="Preço varejo (R$) — vazio = sob consulta"><Input inputMode="decimal" value={f.retail_price} onChange={(e) => set("retail_price", e.target.value)} /></Fld>
              <Fld label="Preço atacado (R$)"><Input inputMode="decimal" value={f.wholesale_price} onChange={(e) => set("wholesale_price", e.target.value)} /></Fld>
              <Fld label="Qtd. mínima p/ atacado (un)"><Input type="number" min={0} value={f.wholesale_min_qty} onChange={(e) => set("wholesale_min_qty", e.target.value)} /></Fld>
              <Fld label="Unidades por caixa *"><Input type="number" min={1} value={f.units_per_box} onChange={(e) => set("units_per_box", e.target.value)} /></Fld>
              <Fld label="Peso por unidade (kg)"><Input inputMode="decimal" value={f.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} placeholder="Deixe vazio se não souber" /></Fld>
              <Fld label="Estoque (un)"><Input type="number" min={0} value={f.stock} onChange={(e) => set("stock", e.target.value)} placeholder="Vazio = não controlar" /></Fld>
              <Fld label="Foto" wide>
                <div className="flex items-center gap-3">
                  <AdminPhoto name={f.name} url={f.image_url} />
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                    <Upload className="h-4 w-4" /> {uploading ? "Enviando…" : "Enviar imagem"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                  </label>
                  {f.image_url && <Button variant="ghost" size="sm" onClick={() => set("image_url", null)}>Remover</Button>}
                </div>
                <Input className="mt-2" placeholder="ou cole uma URL https:// de imagem autorizada" value={f.image_url ?? ""} onChange={(e) => set("image_url", e.target.value || null)} />
                {suggestedPhoto && (
                  <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
                    <p className="font-semibold">Foto de referência encontrada no catálogo {suggestedPhoto.approx ? "(modelo semelhante; conferir)" : "(modelo de referência)"}</p>
                    <p className="break-all select-all text-muted-foreground">{suggestedPhoto.url}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => set("image_url", suggestedPhoto.url)}>
                        Usar esta URL no cadastro
                      </Button>
                      <a href={suggestedPhoto.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary underline">Ver fonte da imagem</a>
                    </div>
                    <p className="text-muted-foreground">Esta imagem vem de outro site. Confirme a correspondência do modelo e a autorização comercial antes de salvar.</p>
                  </div>
                )}
              </Fld>
              <label className="flex items-center gap-2 text-sm"><Switch checked={f.active} onCheckedChange={(v) => set("active", v)} /> Visível no catálogo</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={f.needs_review} onCheckedChange={(v) => set("needs_review", v)} /> Rascunho / verificar</label>
              <div className="sm:col-span-2">
                {editing?.id ? <PriceTiersEditor productId={editing.id} /> : <p className="text-xs text-muted-foreground">Salve o produto para cadastrar preços por faixa de quantidade.</p>}
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button onClick={save} disabled={uploading}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Fld({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <div className={`space-y-1 ${wide ? "sm:col-span-2" : ""}`}><Label>{label}</Label>{children}</div>;
}
function AdminPhoto({ name, url, small = false }: { name: string; url: string | null; small?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const preferred = url || referencePhotos[productSlug(name)]?.url || null;
  const image = preferred && failed !== preferred
    ? preferred
    : "/catalogo/ilustracoes/" + productSlug(name) + ".svg";
  return (
    <div className={small ? "h-10 w-10 shrink-0 overflow-hidden rounded bg-muted" : "h-16 w-16 shrink-0 overflow-hidden rounded bg-muted"}>
      <img
        key={image}
        src={image}
        alt={name}
        loading="lazy"
        className="h-full w-full object-contain"
        referrerPolicy="no-referrer"
        onError={() => setFailed(preferred)}
      />
    </div>
  );
}
