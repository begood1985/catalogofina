/**
 * Meta Pixel — FinaSub (somente navegador e consentimento explícito de marketing).
 * Nunca enviar nome, telefone, CPF, e-mail, texto do orçamento ou dados da sessão.
 */
export const META_PIXEL_ID = "906093145230922";
export const META_CONSENT_KEY = "finasub-meta-marketing-consent-v1";
export const META_CONSENT_EVENT = "finasub-meta-consent-changed";
export type MetaConsent = "granted" | "denied" | null;
export type MetaQuoteItem = { sku: string; quantity: number; unitPrice?: number };

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
};
declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

let sessionConsent: MetaConsent = null;
let previousPagePath = "";
const viewedProducts = new Set<string>();
const openedCheckouts = new Set<string>();

export function getMetaConsent(): MetaConsent {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(META_CONSENT_KEY);
    if (saved === "granted" || saved === "denied") return saved;
  } catch { /* navegação privada: mantém a escolha somente nesta aba */ }
  return sessionConsent;
}

export function initMetaPixel(): void {
  if (typeof window === "undefined" || getMetaConsent() !== "granted" || window.fbq) return;
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  script.dataset.finasubMetaPixel = "1";
  document.head.appendChild(script);
  fbq("init", META_PIXEL_ID);
}

export function setMetaConsent(value: Exclude<MetaConsent, null>): void {
  if (typeof window === "undefined") return;
  sessionConsent = value;
  try { window.localStorage.setItem(META_CONSENT_KEY, value); } catch { /* fallback de sessão */ }
  if (value === "denied") {
    window.fbq?.("consent", "revoke");
    previousPagePath = "";
  } else {
    initMetaPixel();
    window.fbq?.("consent", "grant");
  }
  window.dispatchEvent(new Event(META_CONSENT_EVENT));
}

function fire(name: string, params: Record<string, unknown> = {}, eventId?: string): boolean {
  if (typeof window === "undefined" || getMetaConsent() !== "granted") return false;
  initMetaPixel();
  if (!window.fbq) return false;
  if (eventId) window.fbq("track", name, params, { eventID: eventId });
  else window.fbq("track", name, params);
  return true;
}

function money(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? Math.round(value * 100) / 100 : undefined;
}

function sku(value: string): string {
  return value.trim().slice(0, 80);
}

export function trackPageView(path: string): void {
  if (!path || previousPagePath === path) return;
  if (fire("PageView")) previousPagePath = path;
}

export function trackViewContent(productSku: string, productName: string): void {
  const id = sku(productSku);
  if (!id || viewedProducts.has(id)) return;
  if (fire("ViewContent", {
    content_ids: [id],
    content_type: "product",
    content_name: productName.slice(0, 150),
  })) viewedProducts.add(id);
}

export function trackAddToCart(item: MetaQuoteItem): void {
  const id = sku(item.sku);
  const quantity = Math.floor(item.quantity);
  if (!id || !Number.isFinite(quantity) || quantity <= 0) return;
  const unitPrice = money(item.unitPrice);
  const value = unitPrice === undefined ? undefined : money(unitPrice * quantity);
  fire("AddToCart", {
    content_ids: [id],
    content_type: "product",
    contents: [{ id, quantity, ...(unitPrice === undefined ? {} : { item_price: unitPrice }) }],
    ...(value === undefined ? {} : { value, currency: "BRL" }),
  });
}

export function trackInitiateCheckout(signature: string, items: MetaQuoteItem[], amount?: number): void {
  const valid = items
    .map((item) => ({ id: sku(item.sku), quantity: Math.floor(item.quantity) }))
    .filter((item) => item.id && Number.isFinite(item.quantity) && item.quantity > 0);
  if (!signature || valid.length === 0 || getMetaConsent() !== "granted") return;
  const key = "finasub-checkout-" + signature;
  if (openedCheckouts.has(key)) return;
  try { if (window.sessionStorage.getItem(key)) return; } catch { /* indisponível */ }
  const value = money(amount);
  if (!fire("InitiateCheckout", {
    content_ids: valid.map((item) => item.id),
    content_type: "product",
    contents: valid,
    num_items: valid.reduce((total, item) => total + item.quantity, 0),
    ...(value === undefined ? {} : { value, currency: "BRL" }),
  })) return;
  openedCheckouts.add(key);
  try { window.sessionStorage.setItem(key, "1"); } catch { /* indisponível */ }
}

/** Lead representa orçamento REAL gravado no servidor — não é uma compra. */
export function trackLead(quoteId: string, amount?: number): void {
  if (!/^[a-f\d-]{32,36}$/i.test(quoteId) || getMetaConsent() !== "granted") return;
  const key = "finasub-meta-lead-" + quoteId;
  try { if (window.localStorage.getItem(key)) return; } catch { /* indisponível */ }
  const value = money(amount);
  if (!fire("Lead", {
    content_name: "Orçamento registrado FinaSub",
    ...(value === undefined ? {} : { value, currency: "BRL" }),
  }, "lead_" + quoteId)) return;
  try { window.localStorage.setItem(key, "1"); } catch { /* indisponível */ }
}

/** Contact representa clique humano em WhatsApp, nunca abertura automática. */
export function trackContact(source: "floating_whatsapp" | "quote_whatsapp"): void {
  fire("Contact", { content_name: "WhatsApp FinaSub", contact_source: source });
}
