import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategories, useInvalidate } from "./useAdminData";

export function CategoriesAdmin() {
  const { data = [] } = useCategories();
  const invalidate = useInvalidate();
  const [name, setName] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || n.length > 80) { toast.error("Nome entre 1 e 80 caracteres"); return; }
    const { error } = await supabase.from("categories").insert({ name: n, sort_order: data.length });
    if (error) { toast.error(error.code === "23505" ? "Categoria já existe" : error.message); return; }
    setName("");
    invalidate();
  }
  async function update(id: string, patch: { name?: string; sort_order?: number }) {
    const { error } = await supabase.from("categories").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    invalidate();
  }
  async function del(id: string) {
    if (!confirm("Excluir categoria? Os produtos ficarão sem categoria.")) return;
    await supabase.from("categories").delete().eq("id", id);
    invalidate();
  }

  return (
    <div className="max-w-xl space-y-4">
      <form onSubmit={add} className="flex gap-2">
        <Input placeholder="Nova categoria (ex.: Papéis, Tintas, Canecas)" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit">Adicionar</Button>
      </form>
      {data.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma categoria criada.</p>}
      <ul className="space-y-2">
        {data.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
            <Input type="number" className="w-20" defaultValue={c.sort_order} onBlur={(e) => update(c.id, { sort_order: Number(e.target.value) || 0 })} aria-label="Ordem" />
            <Input defaultValue={c.name} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && update(c.id, { name: e.target.value.trim() })} />
            <Button size="icon" variant="ghost" onClick={() => del(c.id)} aria-label="Excluir"><Trash2 /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}