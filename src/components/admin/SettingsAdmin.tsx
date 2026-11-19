import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInvalidate } from "./useAdminData";

const schema = z.object({
  brand_name: z.string().trim().min(1, "Nome da marca obrigatório").max(60),
  tagline: z.string().trim().max(140),
  whatsapp_phone: z.string().trim().refine((v) => !v || /^\d{12,13}$/.test(v.replace(/\D/g, "")), "WhatsApp com código do país + DDD (ex.: 5545999990000)"),
  min_order_value: z.preprocess((v) => Number(String(v).replace(",", ".")), z.number().min(0, "Valor inválido")),
  payment_methods: z.array(z.string().trim().min(1).max(60)).max(20),
});

export function SettingsAdmin() {
  const invalidate = useInvalidate();
  const { data } = useQuery({ queryKey: ["admin", "settings"], queryFn: async () => (await supabase.from("store_settings").select("*").eq("id", 1).single()).data });
  const [f, setF] = useState({ brand_name: "", tagline: "", whatsapp_phone: "", min_order_value: "250", payment_methods: "" });
  useEffect(() => {
    if (data) setF({ brand_name: data.brand_name, tagline: data.tagline, whatsapp_phone: data.whatsapp_phone, min_order_value: String(data.min_order_value), payment_methods: data.payment_methods.join("\n") });
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse({ ...f, payment_methods: f.payment_methods.split("\n").map((s) => s.trim()).filter(Boolean) });
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? "Dados inválidos"); return; }
    const { error } = await supabase.from("store_settings").update({ ...p.data, whatsapp_phone: p.data.whatsapp_phone.replace(/\D/g, ""), updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Configurações salvas");
    invalidate();
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="space-y-1"><Label>Nome da marca</Label><Input value={f.brand_name} onChange={(e) => setF({ ...f, brand_name: e.target.value })} /></div>
      <div className="space-y-1"><Label>Frase de destaque do catálogo</Label><Input value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} /></div>
      <div className="space-y-1"><Label>WhatsApp de atendimento</Label><Input value={f.whatsapp_phone} onChange={(e) => setF({ ...f, whatsapp_phone: e.target.value })} placeholder="5545999990000" /><p className="text-xs text-muted-foreground">Código do país + DDD + número. Usado no botão "Enviar pelo WhatsApp".</p></div>
      <div className="space-y-1"><Label>Pedido mínimo (R$)</Label><Input inputMode="decimal" value={f.min_order_value} onChange={(e) => setF({ ...f, min_order_value: e.target.value })} /><p className="text-xs text-muted-foreground">Validado também no servidor ao salvar o orçamento.</p></div>
      <div className="space-y-1"><Label>Formas de pagamento (uma por linha)</Label><textarea rows={4} className="w-full rounded-md border border-input bg-background p-2 text-sm" value={f.payment_methods} onChange={(e) => setF({ ...f, payment_methods: e.target.value })} /></div>
      <Button type="submit">Salvar configurações</Button>
    </form>
  );
}