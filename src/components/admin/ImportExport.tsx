import { useState } from "react";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CSV_COLUMNS, parseCsv, planImport, toCsv, validateRows, type ImportRow } from "@/lib/csv";
import { nextInternalSku } from "@/lib/sku";
import { useCategories, useInvalidate, useProducts } from "./useAdminData";

function download(name: string, content: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
}

export function ImportExport() {
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const invalidate = useInvalidate();
  const [preview, setPreview] = useState<{ valid: ImportRow[]; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  function exportProducts() {
    const cat = new Map(categories.map((c) => [c.id, c.name]));
    download(`produtos-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([[...CSV_COLUMNS], ...products.map((p) => [
      p.sku, p.name, p.description, p.category_id ? cat.get(p.category_id) : "", p.retail_price != null ? String(p.retail_price).replace(".", ",") : "",
      p.wholesale_price != null ? String(p.wholesale_price).replace(".", ",") : "", p.wholesale_min_qty, p.units_per_box,
      p.weight_kg != null ? String(p.weight_kg).replace(".", ",") : "", p.stock ?? "", p.image_url ?? "", p.active ? "sim" : "nao", p.needs_review ? "sim" : "nao", p.external_ref ?? "",
    ])]));
  }

  async function onFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { toast.error("Arquivo acima de 5 MB"); return; }
    const res = validateRows(parseCsv(await file.text()));
    if (res.valid.length > 5000) { toast.error("Máximo de 5000 produtos por importação"); return; }
    setPreview(res);
  }

  async function runImport() {
    if (!preview?.valid.length) return;
    setBusy(true);
    try {
      const names = [...new Set(preview.valid.map((r) => r.category).filter(Boolean))];
      const existing = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
      const missing = names.filter((n) => !existing.has(n.toLowerCase()));
      if (missing.length) {
        const { data, error } = await supabase.from("categories").insert(missing.map((name, i) => ({ name, sort_order: categories.length + i }))).select("id, name");
        if (error) throw error;
        data.forEach((c) => existing.set(c.name.toLowerCase(), c.id));
      }
      const { data: current, error: curErr } = await supabase.from("products").select("sku, external_ref");
      if (curErr) throw curErr;
      const plan = planImport(preview.valid, current, (n) => nextInternalSku(current.map((c) => c.sku), n));
      const rows = plan.rows.map(({ category, ...r }) => ({ ...r, category_id: category ? existing.get(category.toLowerCase()) ?? null : null, updated_at: new Date().toISOString() }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("products").upsert(rows.slice(i, i + 500), { onConflict: "sku" });
        if (error) throw error;
      }
      toast.success(`${plan.created} criado(s), ${plan.updated} atualizado(s) — sem duplicar`);
      setPreview(null);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na importação");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 text-sm">
        <h3 className="text-base font-bold">Como importar</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Baixe o modelo e preencha somente com dados que sua empresa tem direito de usar (preços, fotos e estoque próprios).</li>
          <li>Separador <b>;</b> ou <b>,</b>. Decimais aceitam vírgula (12,50). Obrigatórios: <code>nome</code> e <code>sku</code> ou <code>ref_externa</code>. Preço vazio = "sob consulta".</li>
          <li><code>peso_kg</code> e <code>estoque</code> podem ficar vazios. <code>imagem_url</code> deve ser https://. Categorias novas são criadas automaticamente.</li>
          <li>A importação é idempotente: casa por SKU interno, depois por <code>ref_externa</code>; sem nenhum dos dois cadastrados, cria com SKU interno novo (FS-00001…). Reimportar o mesmo arquivo não duplica.</li>
          <li><code>ref_externa</code> guarda temporariamente um código de origem e nunca aparece no catálogo público. <code>revisar=sim</code> marca como rascunho.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => download("modelo-produtos-finasub.csv", toCsv([[...CSV_COLUMNS]]))}><Download /> Baixar modelo</Button>
          <Button variant="outline" onClick={exportProducts} disabled={!products.length}><Download /> Exportar produtos ({products.length})</Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Upload className="h-4 w-4" /> Selecionar CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
          </label>
        </div>
      </div>
      {preview && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-5 text-sm">
          <p><b>{preview.valid.length}</b> linha(s) válida(s) · <b className={preview.errors.length ? "text-destructive" : ""}>{preview.errors.length}</b> com erro</p>
          {preview.errors.length > 0 && (
            <ul className="max-h-40 overflow-y-auto rounded bg-muted p-2 text-xs text-destructive">{preview.errors.slice(0, 100).map((e) => <li key={e}>{e}</li>)}</ul>
          )}
          {preview.valid.length > 0 && (
            <div className="max-h-60 overflow-auto"><table className="w-full text-xs"><tbody>
              {preview.valid.slice(0, 20).map((r) => <tr key={r.sku} className="border-t border-border"><td className="py-1 font-mono">{r.sku}</td><td>{r.name}</td><td>{r.category}</td><td>{r.retail_price}</td><td>{r.wholesale_price ?? "—"}</td></tr>)}
            </tbody></table></div>
          )}
          <div className="flex gap-2">
            <Button onClick={runImport} disabled={busy || !preview.valid.length}>{busy ? "Importando…" : `Importar ${preview.valid.length} produto(s)`}</Button>
            <Button variant="ghost" onClick={() => setPreview(null)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}