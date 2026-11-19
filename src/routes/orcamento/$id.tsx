import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { getQuote } from "@/lib/catalog.functions";
import { trackLead } from "@/lib/meta-pixel";
import { money, kg } from "@/lib/format";
import { FINASUB_WHATSAPP, whatsappUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/orcamento/$id")({
  head: () => ({
    meta: [
      { title: "Orçamento enviado — FinaSub" },
      { name: "description", content: "Seu orçamento foi registrado. Envie o resumo pelo WhatsApp." },
      { property: "og:title", content: "Orçamento enviado — FinaSub" },
      { property: "og:description", content: "Resumo do orçamento de sublimação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ params }) => getQuote({ data: { id: params.id } }),
  component: Success,
});

function Success() {
  const { order, brandName } = Route.useLoaderData();
  useEffect(() => {
    if (order) trackLead(order.id, Number(order.total) || undefined);
  }, [order]);

  if (!order)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div><h1 className="text-2xl font-bold">Orçamento não encontrado</h1><Link to="/" className="mt-4 inline-block underline">Voltar ao catálogo</Link></div>
      </div>
    );
  const lines = order.order_items.map((i) => `• ${i.sku} — ${i.name}: ${i.quantity} un (${i.boxes} cx) = ${i.price_on_request ? "preço sob consulta" : money(Number(i.line_total))}`);
  const text = [
    `Olá, ${brandName}! Segue meu orçamento *${order.code}*`,
    `Cliente: ${order.customer_name}`,
    "",
    ...lines,
    "",
    `Caixas: ${order.total_boxes} · Unidades: ${order.total_units}`,
    order.total_weight_kg != null ? `Peso: ${kg(Number(order.total_weight_kg))}` : null,
    Number(order.discount_total) > 0 ? `Descontos: ${money(Number(order.discount_total))}` : null,
    `*Total${order.has_unpriced_items ? " (itens com preço)" : ""}: ${money(Number(order.total))}*`,
    order.has_unpriced_items ? "Há itens com preço sob consulta — aguardo cotação." : null,
    `Pagamento: ${order.payment_method}`,
    order.notes ? `Obs.: ${order.notes}` : null,
  ].filter((l) => l !== null).join("\n");
  const link = whatsappUrl(text);


  return (
    <div className="min-h-screen bg-ink px-4 py-12">
      <AutoRedirectWhatsapp orderId={order.id} link={link} />
      <div className="mx-auto max-w-2xl rounded-3xl bg-card p-6 shadow-card md:p-10">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h1 className="mt-4 text-3xl font-extrabold">Orçamento registrado!</h1>
        <p className="mt-2 text-muted-foreground">Seu orçamento foi registrado. Você será direcionado ao WhatsApp da FinaSub; confira a mensagem e toque em enviar. Se não abrir, use o botão abaixo.</p>
        <p className="mt-6 inline-block rounded-xl bg-muted px-4 py-2 font-mono text-xl font-bold">{order.code}</p>
        <ul className="mt-6 divide-y divide-border text-sm">
          {order.order_items.map((i) => (
            <li key={i.sku} className="flex justify-between gap-4 py-2">
              <span><span className="font-mono text-xs text-muted-foreground">{i.sku}</span> {i.name} — {i.quantity} un ({i.boxes} cx)</span>
              <b>{i.price_on_request ? "Sob consulta" : money(Number(i.line_total))}</b>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-border pt-4 text-lg">
          <span>Total{order.has_unpriced_items && " (itens com preço)"}</span><b>{money(Number(order.total))}</b>
        </div>
        {order.has_unpriced_items && <p className="mt-2 text-sm text-muted-foreground">Itens com preço sob consulta serão cotados pela equipe.</p>}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {link ? (
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-success px-5 py-3 font-semibold text-success-foreground">
              <MessageCircle className="h-5 w-5" /> Abrir WhatsApp e enviar orçamento
            </a>
          ) : (
            <p className="flex-1 rounded-lg bg-muted p-3 text-sm">O WhatsApp da loja ainda não foi configurado. Nossa equipe entrará em contato.</p>
          )}
          <Link to="/" className="inline-flex flex-1 items-center justify-center rounded-full border border-border px-5 py-3 font-semibold">Voltar ao catálogo</Link>
        </div>
      </div>
    </div>
  );
}
function AutoRedirectWhatsapp({ orderId, link }: { orderId: string; link: string }) {
  // Após um orçamento efetivamente registrado, direcionar o cliente à
  // conversa comercial. Nunca fazer isso para orçamento não encontrado.
  // Guardar o ID na sessão evita ciclos de redirecionamento ao voltar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `finasub-whatsapp-opened-${orderId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
      const timer = window.setTimeout(() => window.location.assign(link), 900);
      return () => window.clearTimeout(timer);
    } catch {
      // A opção de envio manual permanece disponível se o navegador bloquear.
    }
  }, [orderId, link]);
  return null;
}
