import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { computeQuote, type DiscountTier, type PriceTier, type PricingProduct } from "./pricing";
import { fallbackCatalog } from "./fallback-catalog";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from "./supabase-public-config";
import { FINASUB_WHATSAPP } from "./whatsapp";

function publicClient() {
  const url = process.env["SUPABASE_URL"] || PUBLIC_SUPABASE_URL;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || PUBLIC_SUPABASE_KEY;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type CatalogProduct = PricingProduct & {
  sku: string;
  name: string;
  description: string;
  category_id: string | null;
  stock: number | null;
  image_url: string | null;
  needs_review: boolean;
};

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  // A publicação independente pode ainda não ter as chaves do Supabase.
  // Não derrubar a vitrine: oferecer somente referências, sem vendas ativas.
  if (!(process.env["SUPABASE_URL"] || PUBLIC_SUPABASE_URL) || !(process.env["SUPABASE_PUBLISHABLE_KEY"] || PUBLIC_SUPABASE_KEY)) {
    console.warn("FinaSub: Supabase não configurado; vitrine de demonstração ativada.");
    return fallbackCatalog;
  }
  try {
  const sb = publicClient();
  const [products, categories, tiers, settings, priceTiers] = await Promise.all([
    sb
      .from("products")
      .select(
        "id, sku, name, description, category_id, retail_price, wholesale_price, wholesale_min_qty, units_per_box, weight_kg, stock, image_url, needs_review",
      )
      .eq("active", true)
      .order("name"),
    sb.from("categories").select("id, name, sort_order").order("sort_order").order("name"),
    sb.from("discount_tiers").select("product_id, min_qty, percent"),
    sb.from("store_settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("price_tiers").select("product_id, min_qty, unit_price").order("min_qty"),
  ]);
  if (products.error) throw new Error(products.error.message);
  return {
    products: (products.data ?? []).map((p) => ({
      ...p,
      retail_price: p.retail_price == null ? null : Number(p.retail_price),
      wholesale_price: p.wholesale_price == null ? null : Number(p.wholesale_price),
      weight_kg: p.weight_kg == null ? null : Number(p.weight_kg),
    })) as CatalogProduct[],
    priceTiers: (priceTiers.data ?? []).map((t) => ({ ...t, unit_price: Number(t.unit_price) })) as PriceTier[],
    categories: categories.data ?? [],
    tiers: (tiers.data ?? []).map((t) => ({ ...t, percent: Number(t.percent) })) as DiscountTier[],
    offlineMode: false,
    settings: {
      brand_name: settings.data?.brand_name ?? "FinaSub",
      tagline: settings.data?.tagline ?? "",
      whatsapp_phone: FINASUB_WHATSAPP,
      min_order_value: Number(settings.data?.min_order_value ?? 250),
      payment_methods: settings.data?.payment_methods ?? [],
    },
  };
  } catch (error) {
    console.error("FinaSub: não foi possível consultar o Supabase; usando catálogo ilustrativo.", error);
    return fallbackCatalog;
  }
});

export const quoteSchema = z.object({
  customerName: z.string().trim().min(2, "Informe o nome ou razão social").max(150),
  whatsapp: z
    .string()
    .trim()
    .refine((v) => /^\d{10,13}$/.test(v.replace(/\D/g, "")), "WhatsApp inválido (DDD + número)"),
  document: z
    .string()
    .trim()
    .max(20)
    .optional()
    .refine((v) => !v || [11, 14].includes(v.replace(/\D/g, "").length), "CPF (11) ou CNPJ (14 dígitos)"),
  paymentMethod: z.string().trim().min(1, "Escolha a forma de pagamento").max(60),
  notes: z.string().trim().max(1000).optional(),
  items: z
    .array(z.object({ productId: z.string().uuid(), boxes: z.number().int().min(1).max(100000) }))
    .min(1, "Carrinho vazio")
    .max(200),
});

function makeCode() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => alphabet[b % alphabet.length]).join("");
  return `FS-${ymd}-${rnd}`;
}

// Public endpoint: prices, stock and minimum order are recomputed here from the database;
// nothing price-related is trusted from the browser.
export const submitQuote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => quoteSchema.parse(input))
  .handler(async ({ data }) => {
    // A função SECURITY DEFINER valida estoque, faixas, descontos, valor mínimo
    // e grava pedido + itens numa única transação. Não expõe service_role.
    const { data: result, error } = await publicClient().rpc("finasub_submit_quote", {
      payload: data,
    });
    if (error) throw new Error(error.message || "Não foi possível registrar o orçamento");
    if (!result || typeof result !== "object" || !("id" in result)) {
      throw new Error("Resposta inválida do registro de orçamento");
    }
    return result as { id: string; code: string };
  });

// Readable by anyone holding the unguessable order UUID (the customer's success link).
export const getQuote = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    // O UUID é imprevisível; retorna apenas um orçamento individual.
    const { data: result, error } = await publicClient().rpc("finasub_get_quote", {
      quote_id: data.id,
    });
    if (error) throw new Error("Não foi possível consultar o orçamento");
    return result as {
      order: (Database["public"]["Tables"]["orders"]["Row"] & {
        order_items: Database["public"]["Tables"]["order_items"]["Row"][];
      }) | null;
      brandName: string;
      whatsapp: string;
    };
  });
