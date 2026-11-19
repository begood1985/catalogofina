import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { computeQuote, type DiscountTier, type PriceTier, type PricingProduct } from "./pricing";
import { fallbackCatalog } from "./fallback-catalog";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from "./supabase-public-config";

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
      whatsapp_phone: settings.data?.whatsapp_phone ?? "",
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = [...new Set(data.items.map((i) => i.productId))];
    const [prodRes, tierRes, setRes, ptRes] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, sku, name, retail_price, wholesale_price, wholesale_min_qty, units_per_box, weight_kg, stock")
        .in("id", ids)
        .eq("active", true),
      supabaseAdmin.from("discount_tiers").select("product_id, min_qty, percent"),
      supabaseAdmin.from("store_settings").select("min_order_value, payment_methods").eq("id", 1).single(),
      supabaseAdmin.from("price_tiers").select("product_id, min_qty, unit_price").in("product_id", ids),
    ]);
    if (prodRes.error || tierRes.error || setRes.error || ptRes.error) throw new Error("Falha ao consultar o catálogo");
    const products = prodRes.data.map((p) => ({
      ...p,
      retail_price: p.retail_price == null ? null : Number(p.retail_price),
      wholesale_price: p.wholesale_price == null ? null : Number(p.wholesale_price),
      weight_kg: p.weight_kg == null ? null : Number(p.weight_kg),
    }));
    if (products.length !== ids.length) throw new Error("Algum item não está mais disponível. Revise o carrinho.");
    const methods = setRes.data.payment_methods ?? [];
    if (methods.length && !methods.includes(data.paymentMethod)) throw new Error("Forma de pagamento inválida");

    const merged = new Map<string, number>();
    for (const i of data.items) merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.boxes);
    const items = [...merged].map(([productId, boxes]) => ({ productId, boxes }));
    const tiers = tierRes.data.map((t) => ({ ...t, percent: Number(t.percent) }));
    const priceTiers = ptRes.data.map((t) => ({ ...t, unit_price: Number(t.unit_price) }));
    const q = computeQuote(items, products, tiers, Number(setRes.data.min_order_value), priceTiers);

    for (const l of q.lines) {
      const p = products.find((x) => x.id === l.productId)!;
      if (p.stock != null && l.quantity > p.stock)
        throw new Error(`Estoque insuficiente para ${p.sku} (disponível: ${p.stock})`);
    }
    if (!q.meetsMinimum)
      throw new Error(`Pedido mínimo não atingido. Faltam R$ ${q.missingForMinimum.toFixed(2).replace(".", ",")}`);

    let order: { id: string; code: string } | null = null;
    for (let attempt = 0; attempt < 4 && !order; attempt++) {
      const { data: row, error } = await supabaseAdmin
        .from("orders")
        .insert({
          code: makeCode(),
          customer_name: data.customerName,
          whatsapp: data.whatsapp.replace(/\D/g, ""),
          document: data.document ? data.document.replace(/\D/g, "") : null,
          payment_method: data.paymentMethod,
          notes: data.notes || null,
          subtotal: q.subtotal,
          discount_total: q.discountTotal,
          total: q.total,
          total_units: q.totalUnits,
          total_boxes: q.totalBoxes,
          total_weight_kg: q.totalWeightKg,
          has_unpriced_items: q.hasUnpriced,
        })
        .select("id, code")
        .single();
      if (!error) order = row;
      else if (error.code !== "23505") throw new Error("Não foi possível salvar o orçamento");
    }
    if (!order) throw new Error("Não foi possível gerar o código do orçamento");

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(
      q.lines.map((l) => {
        const p = products.find((x) => x.id === l.productId)!;
        return {
          order_id: order!.id,
          product_id: p.id,
          sku: p.sku,
          name: p.name,
          quantity: l.quantity,
          boxes: l.boxes,
          unit_price: l.unitPrice,
          discount_percent: l.discountPercent,
          line_total: l.lineTotal,
          weight_kg: l.weightKg,
          price_on_request: l.priceOnRequest,
        };
      }),
    );
    if (itemsErr) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error("Não foi possível salvar os itens do orçamento");
    }
    return order;
  });

// Readable by anyone holding the unguessable order UUID (the customer's success link).
export const getQuote = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "id, code, customer_name, payment_method, notes, subtotal, discount_total, total, total_units, total_boxes, total_weight_kg, created_at, has_unpriced_items, order_items(sku, name, quantity, boxes, unit_price, discount_percent, line_total, price_on_request)",
      )
      .eq("id", data.id)
      .maybeSingle();
    const { data: s } = await supabaseAdmin.from("store_settings").select("brand_name, whatsapp_phone").eq("id", 1).single();
    return { order, brandName: s?.brand_name ?? "FinaSub", whatsapp: s?.whatsapp_phone ?? "" };
  });