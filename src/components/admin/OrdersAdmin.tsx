import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { money, kg, whatsappLink } from "@/lib/format";
import { toCsv } from "@/lib/csv";
import { useInvalidate } from "./useAdminData";

const STATUS: Record<string, string> = { novo: "Novo", em_atendimento: "Em atendimento", aprovado: "Aprovado", concluido: "Concluído", cancelado: "Cancelado" };

export function OrdersAdmin() {
  const invalidate = useInvalidate();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("todos");
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
  const list = orders.filter((o) => filter === "todos" || o.status === filter);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    invalidate();
  }
  function exportCsv() {
    const rows = [["codigo", "data", "cliente", "whatsapp", "documento", "pagamento", "status", "caixas", "unidades", "peso_kg", "descontos", "total"],
      ...list.map((o) => [o.code, new Date(o.created_at).toLocaleString("pt-BR"), o.customer_name, o.whatsapp, o.document, o.payment_method, STATUS[o.status], o.total_boxes, o.total_units, o.total_weight_kg, o.discount_total, o.total])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button variant="outline" onClick={exportCsv} disabled={!list.length}>Exportar CSV</Button>
        <span className="text-sm text-muted-foreground">{list.length} pedido(s)</span>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum orçamento recebido ainda.</div>
      ) : (
        <ul className="space-y-2">
          {list.map((o) => {
            const wa = whatsappLink(o.whatsapp.length <= 11 ? `55${o.whatsapp}` : o.whatsapp, `Olá, ${o.customer_name}! Sobre o orçamento ${o.code}…`);
            return (
              <li key={o.id} className="rounded-xl border border-border bg-card">
                <button className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-left text-sm" onClick={() => setOpenId(openId === o.id ? null : o.id)}>
                  <span className="font-mono font-bold">{o.code}</span>
                  <span className="flex-1">{o.customer_name}</span>
                  <span className="text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{STATUS[o.status]}</span>
                  <b>{money(o.total)}{o.has_unpriced_items && <span className="ml-1 text-xs font-normal text-accent">+ a cotar</span>}</b>
                </button>
                {openId === o.id && (
                  <div className="space-y-3 border-t border-border p-4 text-sm">
                    <div className="grid gap-1 sm:grid-cols-2">
                      <p>WhatsApp: <b>{o.whatsapp}</b> {wa && <a href={wa} target="_blank" rel="noreferrer" className="text-primary underline">abrir conversa</a>}</p>
                      <p>CPF/CNPJ: <b>{o.document || "—"}</b></p>
                      <p>Pagamento: <b>{o.payment_method}</b></p>
                      <p>{o.total_boxes} caixas · {o.total_units} un{o.total_weight_kg != null && ` · ${kg(Number(o.total_weight_kg))}`}</p>
                    </div>
                    {o.notes && <p className="rounded bg-muted p-2">Obs.: {o.notes}</p>}
                    <table className="w-full">
                      <tbody>{o.order_items.map((i) => (
                        <tr key={i.id} className="border-t border-border"><td className="py-1 font-mono text-xs">{i.sku}</td><td>{i.name}</td><td>{i.quantity} un / {i.boxes} cx</td><td>{i.price_on_request ? "sob consulta" : <>{money(i.unit_price)}{Number(i.discount_percent) > 0 && ` (−${Number(i.discount_percent)}%)`}</>}</td><td className="text-right font-semibold">{i.price_on_request ? "a cotar" : money(i.line_total)}</td></tr>
                      ))}</tbody>
                    </table>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>Status:</span>
                      {Object.entries(STATUS).map(([k, v]) => (
                        <Button key={k} size="sm" variant={o.status === k ? "default" : "outline"} onClick={() => setStatus(o.id, k)}>{v}</Button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}