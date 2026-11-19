import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { getQuote } from "@/lib/catalog.functions";
import { money, kg, whatsappLink } from "@/lib/format";

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
  const { order, whatsapp, brandName } = Route.useLoaderData();
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
  const link = whatsappLink(whatsapp, text);

  return (
    <div className="min-h-screen bg-ink px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-3xl bg-card p-6 shadow-card md:p-10">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h1 className="mt-4 text-3xl font-extrabold">Orçamento registrado!</h1>
        <p className="mt-2 text-muted-foreground">Guarde o código abaixo. Para agilizar o atendimento, envie o resumo pelo WhatsApp.</p>
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
              <MessageCircle className="h-5 w-5" /> Enviar pelo WhatsApp
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