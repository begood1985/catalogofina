// Meta Pixel helpers (browser only — call from effects/handlers).
export const META_PIXEL_ID = "906093145230922";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq } }

export function initMetaPixel() {
  if (typeof window === "undefined" || window.fbq) return;
  const n: Fbq = function (...args: unknown[]) {
    n.callMethod ? (n.callMethod as (...a: unknown[]) => void)(...args) : n.queue!.push(args);
  } as Fbq;
  n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
  window.fbq = n; window._fbq = n;
  const s = document.createElement("script");
  s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  n("init", META_PIXEL_ID);
}

export function trackPageView() { window.fbq?.("track", "PageView"); }

export function trackLead(orderId: string, value?: number) {
  if (typeof window === "undefined") return;
  initMetaPixel();
  const key = `fb_lead_${orderId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  window.fbq?.("track", "Lead", value ? { value, currency: "BRL" } : {}, { eventID: `lead_${orderId}` });
}
