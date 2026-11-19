import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  META_CONSENT_KEY, setMetaConsent, trackAddToCart, trackContact, trackInitiateCheckout,
  trackLead, trackPageView, trackViewContent,
} from "./meta-pixel";

const quoteId = "d28b346a-8f13-4d0e-ac13-9fc3556d72c4";
const calls = () => (window.fbq as unknown as ReturnType<typeof vi.fn>).mock.calls
  .filter((c: unknown[]) => c[0] === "track");

describe("Meta Pixel FinaSub: somente com consentimento e sem compras fictícias", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    const fbq = vi.fn() as typeof window.fbq;
    window.fbq = fbq;
    setMetaConsent("denied");
    (window.fbq as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  it("não envia eventos enquanto o usuário não autorizar marketing", () => {
    trackPageView("/teste");
    trackViewContent("FS-SEM-CONSENT", "Caneca");
    trackAddToCart({ sku: "FS-SEM-CONSENT", quantity: 36, unitPrice: 8.5 });
    trackLead("00000000-0000-4000-8000-000000000000", 306);
    trackContact("floating_whatsapp");
    expect(calls()).toHaveLength(0);
  });

  it("autoriza PageView uma vez por rota e revoga o consentimento", () => {
    setMetaConsent("granted");
    trackPageView("/catalogo-a");
    trackPageView("/catalogo-a");
    trackPageView("/carrinho");
    expect(calls().map((c: unknown[]) => c[1])).toEqual(["PageView", "PageView"]);
    setMetaConsent("denied");
    trackPageView("/outra");
    expect(calls()).toHaveLength(2);
    expect(localStorage.getItem(META_CONSENT_KEY)).toBe("denied");
  });

  it("emite eventos comerciais com SKU, quantidade e preço, nunca Purchase", () => {
    setMetaConsent("granted");
    trackViewContent("FS-VIEW-001", "Caneca branca");
    trackViewContent("FS-VIEW-001", "Caneca branca");
    trackAddToCart({ sku: "FS-001", quantity: 36, unitPrice: 8.5 });
    trackInitiateCheckout("cart-36-FS-001", [{ sku: "FS-001", quantity: 36 }], 306);
    trackInitiateCheckout("cart-36-FS-001", [{ sku: "FS-001", quantity: 36 }], 306);
    trackContact("floating_whatsapp");
    trackLead(quoteId, 306);
    trackLead(quoteId, 306);
    const sent = calls();
    expect(sent.map((c: unknown[]) => c[1])).toEqual([
      "ViewContent", "AddToCart", "InitiateCheckout", "Contact", "Lead",
    ]);
    expect(sent[1]?.[2]).toMatchObject({
      content_ids: ["FS-001"], contents: [{ id: "FS-001", quantity: 36, item_price: 8.5 }],
      value: 306, currency: "BRL",
    });
    expect(sent[4]?.[3]).toEqual({ eventID: "lead_" + quoteId });
    expect(JSON.stringify(sent)).not.toMatch(/customerName|whatsapp|cpf|email|Purchase/);
  });

  it("não atribui valor fictício a produto ou orçamento sob consulta", () => {
    setMetaConsent("granted");
    trackAddToCart({ sku: "FS-SEM-PRECO", quantity: 36 });
    trackLead("11111111-1111-4111-8111-111111111111");
    const sent = calls();
    expect(sent[0]?.[2]).not.toHaveProperty("value");
    expect(sent[1]?.[2]).not.toHaveProperty("value");
  });
});
