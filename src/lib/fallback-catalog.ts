// Dados ilustrativos disponíveis sem conexão com o banco, para que a página não quebre.
// Não são estoque, preços ou orçamentos reais; substituir pelo Supabase em produção.
import type { CatalogProduct } from "./catalog.functions";

export const fallbackCategories = [
  { id: "ceramica", name: "Canecas de cerâmica", sort_order: 1 },
  { id: "magica", name: "Canecas mágicas", sort_order: 2 },
  { id: "especiais", name: "Canecas especiais", sort_order: 3 },
  { id: "vidro", name: "Vidro e chopeiras", sort_order: 4 },
  { id: "xicaras", name: "Xícaras", sort_order: 5 },
];

const demoProducts: Array<{ name: string; units_per_box: number }> = [
  {
    "name": "Caneca Cerâmica Orca Brilhante AA",
    "units_per_box": 36
  },
  {
    "name": "Caneca Cerâmica Orca Premium AAA",
    "units_per_box": 36
  },
  {
    "name": "Caneca Cerâmica Starfish Brilho AA",
    "units_per_box": 36
  },
  {
    "name": "Caneca Cerâmica Starfish Brilho AAA",
    "units_per_box": 36
  },
  {
    "name": "Caneca Colorida com Tarja Branca",
    "units_per_box": 36
  },
  {
    "name": "Caneca Colorida com Alça Coração",
    "units_per_box": 36
  },
  {
    "name": "Caneca Colorida com Alça Normal",
    "units_per_box": 36
  },
  {
    "name": "Caneca com Colher Cônica",
    "units_per_box": 36
  },
  {
    "name": "Caneca com Colher Reta Inteira",
    "units_per_box": 36
  },
  {
    "name": "Caneca Mágica Preta Fosca 235 ml",
    "units_per_box": 36
  },
  {
    "name": "Caneca Mágica com Colher",
    "units_per_box": 36
  },
  {
    "name": "Caneca Mágica Colorida no Interior",
    "units_per_box": 36
  },
  {
    "name": "Caneca Coração Mágica",
    "units_per_box": 36
  },
  {
    "name": "Caneca Mágica Glitter Sky",
    "units_per_box": 36
  },
  {
    "name": "Caneca Perolizada Prata e Dourada 325 ml",
    "units_per_box": 36
  },
  {
    "name": "Caneca Glitter",
    "units_per_box": 36
  },
  {
    "name": "Caneca Metalizada 325 ml e Metalizada Bicolor",
    "units_per_box": 36
  },
  {
    "name": "Caneca Neon 325 ml",
    "units_per_box": 36
  },
  {
    "name": "Caneca de Polímero Pesada Resinada 350 ml",
    "units_per_box": 50
  },
  {
    "name": "Caneca 3 oz - 85 ml",
    "units_per_box": 72
  },
  {
    "name": "Caneca 6 oz - 170 ml",
    "units_per_box": 48
  },
  {
    "name": "Caneca 11 oz de Alumínio Esmaltada",
    "units_per_box": 48
  },
  {
    "name": "Caneca Branca Cônica NH-04 12 oz",
    "units_per_box": 36
  },
  {
    "name": "Caneca Cerâmica Resinada Colmeia 350 ml",
    "units_per_box": 36
  },
  {
    "name": "Caneca Colorida Resinada 425 ml",
    "units_per_box": 36
  },
  {
    "name": "Caneca com Tampa e Base Siliconada",
    "units_per_box": 36
  },
  {
    "name": "Caneca de Vidro Jateada 325 ml",
    "units_per_box": 36
  },
  {
    "name": "Caneca de Vidro Jateada 325 ml Colorida",
    "units_per_box": 36
  },
  {
    "name": "Caneca de Chopp Jateada Colorida 450 ml",
    "units_per_box": 24
  },
  {
    "name": "Caneca de Chopp Jateada 450 ml",
    "units_per_box": 24
  },
  {
    "name": "Chopeira Transparente Lisa 450 ml com Tarja Branca",
    "units_per_box": 24
  },
  {
    "name": "Caneca de Chopp 580 ml - 20 oz",
    "units_per_box": 24
  },
  {
    "name": "Caneca Branca NH-03 em Formato de Coração",
    "units_per_box": 36
  },
  {
    "name": "Torre com 4 Xícaras Resinadas 150 ml",
    "units_per_box": 24
  },
  {
    "name": "Xícara com Pires e Colher 175 ml",
    "units_per_box": 24
  }
];

function categoryOf(name: string) {
  if (/xícara/i.test(name)) return "xicaras";
  if (/vidro|chopp|chopeira/i.test(name)) return "vidro";
  if (/mágica|magica/i.test(name)) return "magica";
  if (/orca|starfish|cerâmica|ceramica|colmeia/i.test(name)) return "ceramica";
  return "especiais";
}

export const fallbackCatalog = {
  offlineMode: true,
  products: demoProducts.map((p, i): CatalogProduct => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    sku: `FS-DEMO-${String(i + 1).padStart(3, "0")}`,
    name: p.name,
    description: "Produto de referência; confirmação comercial necessária.",
    category_id: categoryOf(p.name),
    retail_price: null,
    wholesale_price: null,
    wholesale_min_qty: 0,
    units_per_box: p.units_per_box,
    weight_kg: null,
    stock: null,
    image_url: null,
    needs_review: true,
  })),
  categories: fallbackCategories,
  tiers: [],
  priceTiers: [],
  settings: {
    brand_name: "FinaSub",
    tagline: "Conheça nossa linha de sublimação",
    whatsapp_phone: "",
    min_order_value: 250,
    payment_methods: [],
  },
};
