/*
 * Catalogue WHITE SAYY : types, données par défaut et règles métier partagées
 * entre le rendu serveur (SSR), le navigateur et les tests.
 *
 * Les données publiées depuis l'administration (table Supabase `shop_data`)
 * gardent exactement la même forme que `DEFAULT_SHOP` : elles sont fusionnées
 * par-dessus ces valeurs par défaut (voir `mergeShop`).
 */

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

export type CategoryId = "tshirt" | "sweat" | "jogging" | "ensemble";

export type Category = {
  id: CategoryId;
  slug: string;
  plural: string;
  singular: string;
  /** Libellé utilisé devant le nom d'un produit (« Sweat zippé DRIP WHITESAYY »). */
  prefix: string;
  title: string;
  description: string;
  intro: string;
  cover: string;
};

export const CATEGORIES: Category[] = [
  {
    id: "tshirt",
    slug: "t-shirts",
    plural: "T-shirts",
    singular: "T-shirt",
    prefix: "T-shirt",
    title: "T-shirts oversize streetwear",
    description:
      "T-shirts oversize WHITE SAYY : coupe ample, grands visuels imprimés au dos, coloris noir et blanc. Du XS au XXL, livraison en France.",
    intro:
      "Des t-shirts à la coupe oversize, pensés pour tomber large sur les épaules. Chaque pièce porte un visuel discret à la poitrine et une grande impression dans le dos.",
    cover: "p_tw_b",
  },
  {
    id: "sweat",
    slug: "sweats",
    plural: "Sweats",
    singular: "Sweat",
    prefix: "Sweat zippé",
    title: "Sweats zippés à capuche",
    description:
      "Sweats zippés à capuche WHITE SAYY : coupe oversize ou boxy, poche kangourou, grand lettrage au dos. Noir, marron chocolat, gris anthracite.",
    intro:
      "Le sweat zippé à capuche, pièce centrale de la marque. Coupes oversize ou boxy, fermeture zippée, poche kangourou et grand visuel au dos.",
    cover: "p_ha_b",
  },
  {
    id: "jogging",
    slug: "joggings",
    plural: "Joggings",
    singular: "Jogging",
    prefix: "Jogging",
    title: "Joggings coupe ballon",
    description:
      "Joggings WHITE SAYY coupe ballon : jambe large et arrondie, taille élastiquée, poches latérales et logo sur la cuisse. Du XS au XXL.",
    intro:
      "Une coupe ballon à la jambe large et arrondie, une taille élastiquée et un logo sur la cuisse. Le bas qui complète chaque sweat de la collection.",
    cover: "p_jd_f",
  },
  {
    id: "ensemble",
    slug: "ensembles",
    plural: "Ensembles",
    singular: "Ensemble",
    prefix: "",
    title: "Ensembles sweat + jogging",
    description:
      "Ensembles WHITE SAYY sweat zippé + jogging coupe ballon, à prix réduit par rapport à l'achat séparé. Une taille au choix pour chaque pièce.",
    intro:
      "Le sweat zippé et le jogging assortis, réunis à un prix inférieur à l'achat séparé. Tu choisis une taille différente pour chaque pièce.",
    cover: "p_set_s_f",
  },
];

export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);
export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

export type Product = {
  id: string;
  category: CategoryId;
  line?: string;
  name: string;
  subtitle: string;
  tagline?: string;
  price: number;
  description: string;
  details: string[];
  care?: string;
  sizes: Partial<Record<string, number>>;
  images: string[];
  components?: string[];
  has360?: boolean;
  isNew?: boolean;
  active?: boolean;
  createdAt?: string;
  related?: string[];
};

export type Review = {
  id?: string;
  name: string;
  rating: number;
  text: string;
  size?: string;
  productId?: string;
  photo?: string;
  date?: string;
  approved?: boolean;
  featured?: boolean;
  pending?: boolean;
};

export type Ugc = { photo: string; handle?: string; link?: string };

export type Promo = {
  code: string;
  active: boolean;
  discountType?: "percent" | "amount";
  value: number;
  minSubtotal?: number;
  appliesToAll?: boolean;
  productIds?: string[];
  showBanner?: boolean;
  bannerText?: string;
};

export type Settings = {
  announcement: string;
  shipping: number;
  freeFrom: number;
  lowStock: number;
  contactEmail: string;
  instagram: string;
  paymentLink: string;
  heroImage: string;
  heroEyebrow: string;
  heroLine1: string;
  heroLine2: string;
  spirit: string;
  promises: string[];
  about: string;
  legal: string;
  shippingInfo: string;
  sizeGuides: Record<string, string>;
  sizeAdvice: string;
};

export type Shop = {
  version: number;
  publishedAt: string | null;
  settings: Settings;
  products: Product[];
  reviews: Review[];
  ugc: Ugc[];
  promos: Promo[];
};

const stock = () => ({ XS: 99, S: 99, M: 99, L: 99, XL: 99, XXL: 99 });
const CARE_TEE =
  "Lavage à 30 °C sur l'envers. Ne pas sécher en machine. Repassage sur l'envers, sans passer sur l'impression.";
const CARE_FLEECE =
  "Lavage à 30 °C sur l'envers, avec des couleurs similaires. Ne pas sécher en machine. Ne pas repasser sur l'impression.";

const base = { has360: false, isNew: false, active: true, createdAt: "2026-10-17", related: [] as string[] };

const tee = (id: string, name: string, color: string, line: string, images: string[], description: string, details: string[]): Product => ({
  ...base, id, category: "tshirt", line, name, subtitle: "T-shirt oversize", tagline: color, price: 29.99, description, details, care: CARE_TEE, sizes: stock(), images,
});
const sweat = (id: string, name: string, color: string, line: string, images: string[], description: string, details: string[]): Product => ({
  ...base, id, category: "sweat", line, name, subtitle: "Sweat zippé à capuche", tagline: color, price: 49.99, description, details, care: CARE_FLEECE, sizes: stock(), images,
});
const JOG_DETAILS = (logo: string) => ["Coupe ballon, jambe large et arrondie", "Taille élastiquée", "Poches latérales", "Deux poches passepoilées au dos", logo];
const jog = (id: string, name: string, color: string, line: string, images: string[], description: string, details: string[]): Product => ({
  ...base, id, category: "jogging", line, name, subtitle: "Jogging coupe ballon", tagline: color, price: 39.99, description, details, care: CARE_FLEECE, sizes: stock(), images,
});
const set = (id: string, name: string, color: string, line: string, images: string[], components: string[], description: string): Product => ({
  ...base, id, category: "ensemble", line, name, subtitle: "Ensemble sweat + jogging", tagline: color, price: 76.99, description,
  details: ["Sweat zippé à capuche + jogging coupe ballon", "Choisis une taille pour chaque pièce", "Prix de l'ensemble inférieur à l'achat séparé"],
  care: CARE_FLEECE, sizes: {}, images, components,
});

/** Version minimale acceptée pour des données publiées (identique à l'ancienne boutique). */
export const SHOP_VERSION = 5;

export const DEFAULT_SHOP: Shop = {
  version: SHOP_VERSION,
  publishedAt: null,
  settings: {
    announcement: "",
    shipping: 4.99,
    freeFrom: 0,
    lowStock: 5,
    contactEmail: "",
    instagram: "l_.say",
    paymentLink: "",
    heroImage: "hero",
    heroEyebrow: "Streetwear · Est. 2026",
    heroLine1: "Une identité.",
    heroLine2: "WHITE SAYY.",
    spirit: "Un design brut, un noir profond, un nom qui s'affiche. Pensé pour être porté, pas juste regardé.",
    promises: ["Paiement sécurisé", "Toutes les tailles affichées en temps réel", "Contact direct avec la marque"],
    about:
      "WHITE SAYY est une marque streetwear née d'une envie simple : porter un nom, une attitude. Des pièces noires, un graphisme brut, rien de superflu.",
    legal:
      "Éditeur du site : WHITE SAYY.\nContact : voir la page Contact.\nHébergement : Lovable.\n\nLes informations saisies lors d'une commande servent uniquement à la traiter et à la livrer.",
    shippingInfo:
      "Les frais de livraison sont affichés avant validation de la commande. Pour un échange de taille, contacte-nous avec ton numéro de commande.",
    sizeGuides: {
      tshirt: "Taille;Longueur (cm);Largeur (cm)\nXS;68;54\nS;70;56\nM;72;58\nL;74;60\nXL;76;62\nXXL;78;64",
      sweat: "Taille;Longueur (cm);Largeur (cm);Manche (cm)\nXS;64;60;56\nS;66;62;57\nM;68;64;58\nL;70;66;59\nXL;72;68;60\nXXL;74;70;61",
      jogging: "Taille;Tour de taille (cm);Longueur (cm)\nXS;64-70;96\nS;68-74;98\nM;72-78;100\nL;76-84;102\nXL;82-90;104\nXXL;88-96;106",
    },
    sizeAdvice:
      "Coupe oversize : prends ta taille habituelle pour un tombé ample, une taille en dessous pour un effet plus ajusté.",
  },
  products: [
    set("ensemble-art-of-rich", "ENSEMBLE ART OF RICH", "Marron chocolat", "art-of-rich", ["p_set_a_f", "p_set_a_b", "p_ha_f", "p_ha_b", "p_ja_f", "p_ja_b"], ["sweat-art-of-rich", "jogging-art-of-rich"], "Le sweat zippé et le jogging ART OF RICH réunis, en marron chocolat. Logo blanc à la poitrine et sur la cuisse, grand lettrage ART OF RICH au dos du sweat."),
    sweat("sweat-sayy-studio", "SAYY STUDIO AMSTERDAM", "Gris anthracite", "sayy-studio", ["p_hs_f", "p_hs_b"], "Sweat zippé gris anthracite, signé Sayy Studio Amsterdam 2026 en noir ton sur ton : discret à la poitrine, en grand au dos.", ["Coupe oversize", "Fermeture zippée double curseur", "Poche kangourou", "Bords-côtes aux poignets et à la taille", "Inscription poitrine, grand visuel au dos"]),
    tee("wsayy", "WSAYY", "Noir", "wsayy", ["p_tw_f", "p_tw_b"], "T-shirt noir au grand visuel bleu électrique dans le dos : logo WSAYY, Netherland Made · Est. 2026 · White Sayy Studio. Petit carré bleu à la poitrine.", ["Coupe oversize", "Coloris noir", "Petit visuel bleu à l'avant", "Grand visuel WSAYY au dos", "Étiquette WHITE SAYY au col"]),
    jog("jogging-drip", "DRIP WHITESAYY", "Noir", "drip", ["p_jd_f", "p_jd_b"], "Jogging noir coupe ballon, logo Drip WHITESAYY Netherland Made en blanc sur la cuisse.", JOG_DETAILS("Logo blanc sur la cuisse")),
    sweat("sweat-drip", "DRIP WHITESAYY", "Noir", "drip", ["p_hd_f", "p_hd_b"], "Sweat zippé noir, logo Drip WHITESAYY Netherland Made en blanc : petit à la poitrine, en grand au dos.", ["Coupe oversize", "Fermeture zippée", "Poche kangourou", "Bords-côtes aux poignets et à la taille", "Logo poitrine, grand visuel au dos"]),
    tee("piece-of-art", "PIECE OF ART", "Blanc", "piece-of-art", ["p_tp_f", "p_tp_b"], "T-shirt blanc au lettrage PIECE OF ART effet denim effiloché, petit à la poitrine et en grand dans le dos.", ["Coupe oversize", "Coloris blanc", "Lettrage effet denim effiloché", "Petit logo avant, grand visuel au dos", "Étiquette WHITE SAYY au col"]),
    set("ensemble-sayy-studio", "ENSEMBLE SAYY STUDIO", "Gris anthracite", "sayy-studio", ["p_set_s_f", "p_set_s_b", "p_hs_f", "p_hs_b", "p_js_f", "p_js_b"], ["sweat-sayy-studio", "jogging-sayy-studio"], "Le sweat zippé et le jogging Sayy Studio Amsterdam 2026 réunis, en gris anthracite avec inscriptions noires ton sur ton."),
    sweat("sweat-white-sayy", "WHITE SAYY ZIP", "Noir", "white-sayy", ["p_hw_f", "p_hw_b"], "Sweat zippé noir à la coupe courte et carrée. Zip jusqu'en haut de la capuche, grand lettrage WHITE SAYY gris au dos.", ["Coupe boxy courte", "Zip intégral jusqu'à la capuche", "Poche kangourou", "Bords-côtes aux poignets et à la taille", "Grand lettrage gris au dos"]),
    jog("jogging-art-of-rich", "ART OF RICH", "Marron chocolat", "art-of-rich", ["p_ja_f", "p_ja_b"], "Jogging marron chocolat coupe ballon, logo ART OF RICH blanc sur la cuisse.", JOG_DETAILS("Logo blanc sur la cuisse")),
    sweat("sweat-art-of-rich", "ART OF RICH", "Marron chocolat", "art-of-rich", ["p_ha_f", "p_ha_b"], "Sweat zippé marron chocolat, logo ART OF RICH blanc à la poitrine et lettrage géant au dos.", ["Coupe oversize", "Fermeture zippée double curseur", "Poche kangourou", "Bords-côtes aux poignets et à la taille", "Logo poitrine, grand visuel au dos"]),
    set("ensemble-drip", "ENSEMBLE DRIP WHITESAYY", "Noir", "drip", ["p_set_d_f", "p_set_d_b", "p_hd_f", "p_hd_b", "p_jd_f", "p_jd_b"], ["sweat-drip", "jogging-drip"], "Le sweat zippé et le jogging Drip WHITESAYY réunis, en noir avec logo blanc Netherland Made."),
    jog("jogging-sayy-studio", "SAYY STUDIO AMSTERDAM", "Gris anthracite", "sayy-studio", ["p_js_f", "p_js_b"], "Jogging gris anthracite coupe ballon, inscription Sayy Studio Amsterdam 2026 en noir sur la cuisse.", JOG_DETAILS("Inscription noire sur la cuisse")),
    tee("bye-dubai", "BYE, DUBAI", "Blanc", "bye-dubai", ["p_tb_f", "p_tb_b"], "T-shirt blanc, logo BYE, dubai noir : petit à la poitrine, en grand dans le dos.", ["Coupe oversize", "Coloris blanc", "Petit logo à l'avant, grand visuel au dos", "Étiquette WHITE SAYY au col"]),
  ],
  reviews: [],
  ugc: [],
  promos: [],
};

/* ------------------------------------------------------------------ */
/* Fusion des données publiées                                        */
/* ------------------------------------------------------------------ */

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function merge(baseValue: unknown, over: unknown): unknown {
  if (Array.isArray(baseValue) || typeof baseValue !== "object" || baseValue === null) {
    return over === undefined ? clone(baseValue) : over;
  }
  const out: Record<string, unknown> = {};
  const b = baseValue as Record<string, unknown>;
  const o = (over && typeof over === "object" ? over : {}) as Record<string, unknown>;
  for (const k of new Set([...Object.keys(b), ...Object.keys(o)])) {
    out[k] = k in b ? merge(b[k], o[k]) : o[k];
  }
  return out;
}

/** Image intégrée (data URL) trop lourde pour être servie dans le HTML public. */
const MAX_INLINE_IMAGE = 60_000;
const isHeavyInline = (v: unknown) => typeof v === "string" && v.startsWith("data:") && v.length > MAX_INLINE_IMAGE;
const isBrokenInline = (v: unknown) => typeof v === "string" && v.startsWith("data:") && !/^data:image\/[\w+.-]+;base64,[A-Za-z0-9+/=]+$/.test(v);

/**
 * Fusionne les données publiées avec les valeurs par défaut et nettoie ce qui
 * ne doit pas arriver côté public (images base64 corrompues ou trop lourdes,
 * avis non approuvés).
 */
export function mergeShop(published: unknown): Shop {
  const pub =
    published && typeof published === "object" && Number((published as Shop).version || 0) >= SHOP_VERSION
      ? published
      : {};
  const shop = merge(DEFAULT_SHOP, pub) as Shop;
  if (!shop.settings.instagram) shop.settings.instagram = DEFAULT_SHOP.settings.instagram;
  shop.products = (Array.isArray(shop.products) ? shop.products : []).filter(
    (p) => p && typeof p.id === "string" && typeof p.name === "string",
  );
  shop.ugc = (Array.isArray(shop.ugc) ? shop.ugc : []).filter(
    (u) => u && typeof u.photo === "string" && u.photo && !isHeavyInline(u.photo) && !isBrokenInline(u.photo),
  );
  shop.reviews = (Array.isArray(shop.reviews) ? shop.reviews : [])
    .filter((r) => r && r.text && r.approved !== false && !r.pending)
    .map((r) => (isHeavyInline(r.photo) || isBrokenInline(r.photo) ? { ...r, photo: undefined } : r));
  shop.promos = Array.isArray(shop.promos) ? shop.promos : [];
  return shop;
}

/* ------------------------------------------------------------------ */
/* Règles produit                                                     */
/* ------------------------------------------------------------------ */

export const activeProducts = (shop: Shop) => shop.products.filter((p) => p.active !== false);
export const findProduct = (shop: Shop, id: string) => shop.products.find((p) => p.id === id);
export const isSet = (p: Product | undefined): p is Product & { components: string[] } =>
  p?.category === "ensemble" && Array.isArray(p.components) && p.components.length === 2;
export const partsOf = (shop: Shop, p: Product) =>
  isSet(p) ? p.components.map((id) => findProduct(shop, id)) : [];

export function stockOf(shop: Shop, p: Product, size: string): number {
  if (isSet(p)) {
    const [a, b] = String(size).split(" / ");
    const [x, y] = partsOf(shop, p);
    return x && y && a && b ? Math.min(stockOf(shop, x, a), stockOf(shop, y, b)) : 0;
  }
  const n = Number(p.sizes?.[size] ?? 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function totalStock(shop: Shop, p: Product): number {
  if (isSet(p)) {
    const parts = partsOf(shop, p);
    return parts.length ? Math.min(...parts.map((c) => (c ? totalStock(shop, c) : 0))) : 0;
  }
  return Object.values(p.sizes || {}).reduce<number>((a, b) => a + Math.max(0, Number(b) || 0), 0);
}

export const sizesOf = (p: Product) => SIZES.filter((s) => s in (p.sizes || {}));

export const compareAt = (shop: Shop, p: Product) =>
  isSet(p) ? partsOf(shop, p).reduce((a, c) => a + (c ? Number(c.price) : 0), 0) : 0;

export const isLow = (shop: Shop, n: number) => n > 0 && n <= (Number(shop.settings.lowStock) || 0);

export function sizeLabel(p: Product, size: string): string {
  if (!isSet(p)) return `Taille ${size}`;
  const [a, b] = String(size).split(" / ");
  return `Sweat ${a} · Jogging ${b}`;
}

/**
 * Nom complet et unique d'un produit : « Sweat zippé DRIP WHITESAYY » et
 * « Jogging DRIP WHITESAYY » ne se confondent plus.
 */
export function fullName(p: Product): string {
  const cat = categoryById(p.category);
  if (!cat?.prefix) return p.name;
  const upper = p.name.toUpperCase();
  if (upper.startsWith(cat.singular.toUpperCase()) || upper.startsWith(cat.prefix.toUpperCase())) return p.name;
  return `${cat.prefix} ${p.name}`;
}

export function relatedOf(shop: Shop, p: Product): Product[] {
  if (p.related?.length) {
    return p.related.map((id) => findProduct(shop, id)).filter((x): x is Product => !!x && x.active !== false);
  }
  const all = activeProducts(shop).filter((x) => x.id !== p.id && !(isSet(p) && p.components.includes(x.id)));
  const same = all.filter((x) => x.line && x.line === p.line);
  const comp = all.filter(
    (x) =>
      !same.includes(x) &&
      (p.category === "tshirt" ? x.category === "tshirt" : x.category !== p.category && x.category !== "tshirt"),
  );
  const rest = all.filter((x) => !same.includes(x) && !comp.includes(x));
  return [...same, ...comp, ...rest].slice(0, 4);
}

export function sortNewest(shop: Shop, list: Product[]): Product[] {
  const order = shop.products.map((p) => p.id);
  return [...list].sort(
    (a, b) =>
      Number(!!b.isNew) - Number(!!a.isNew) ||
      String(b.createdAt).localeCompare(String(a.createdAt)) ||
      order.indexOf(a.id) - order.indexOf(b.id),
  );
}

export const reviewsFor = (shop: Shop, productId?: string) =>
  shop.reviews.filter((r) => r.text && (!productId || !r.productId || r.productId === productId));

export const averageRating = (reviews: Review[]) =>
  reviews.reduce((a, r) => a + (Number(r.rating) || 5), 0) / (reviews.length || 1);

/** Tableau du guide des tailles : première ligne = en-têtes. */
export function sizeGuideRows(shop: Shop, key: string): string[][] {
  const src = shop.settings.sizeGuides?.[key] || "";
  return src
    .split(/\n/)
    .map((l) => l.split(/[;\t]/).map((c) => c.trim()))
    .filter((r) => r.some(Boolean));
}

/* ------------------------------------------------------------------ */
/* Panier, livraison et codes promo (miroir de /api/public/checkout)   */
/* ------------------------------------------------------------------ */

export type CartLine = { id: string; size: string; qty: number };

export const normalizePromoCode = (code: unknown) => String(code ?? "").trim().toUpperCase().replace(/\s+/g, "");

export const cartSubtotal = (shop: Shop, cart: CartLine[]) =>
  cart.reduce((s, i) => {
    const p = findProduct(shop, i.id);
    return s + (p ? Number(p.price) * i.qty : 0);
  }, 0);

export function shippingFor(shop: Shop, subtotal: number): number {
  const free = Number(shop.settings.freeFrom) || 0;
  if (free > 0 && subtotal >= free) return 0;
  return Number(shop.settings.shipping) || 0;
}

export type PromoResult =
  | { ok: true; code: string; discount: number; promo: Promo }
  | { ok: false; error: string };

export function calculatePromo(shop: Shop, code: string, cart: CartLine[]): PromoResult {
  const normalized = normalizePromoCode(code);
  const promo = shop.promos.find((x) => x.active === true && normalized && normalizePromoCode(x.code) === normalized);
  if (!promo) return { ok: false, error: "Code promo invalide ou inactif." };
  const subtotal = cartSubtotal(shop, cart);
  const minimum = Math.max(0, Number(promo.minSubtotal) || 0);
  if (subtotal + 0.001 < minimum) return { ok: false, error: `Ce code est valable dès ${eur(minimum)} d'achat.` };
  const eligible = cart.filter((i) => promo.appliesToAll !== false || (promo.productIds || []).includes(i.id));
  const eligibleSubtotal = cartSubtotal(shop, eligible);
  if (eligibleSubtotal <= 0) return { ok: false, error: "Ce code ne s'applique à aucun article de ton panier." };
  const value = Math.max(0, Number(promo.value) || 0);
  if (value <= 0) return { ok: false, error: "Ce code promo n'est pas encore configuré." };
  const raw = promo.discountType === "percent" ? (eligibleSubtotal * Math.min(100, value)) / 100 : value;
  const discount = Math.round(Math.min(eligibleSubtotal, raw) * 100) / 100;
  return { ok: true, code: normalizePromoCode(promo.code), discount, promo };
}

export const bannerPromo = (shop: Shop) =>
  shop.promos.find((x) => x.active === true && x.showBanner && normalizePromoCode(x.code));

export function promoBannerText(promo: Promo): string {
  const value = promo.discountType === "percent" ? `−${Number(promo.value) || 0} %` : `−${eur(promo.value)}`;
  const fallback = `${normalizePromoCode(promo.code)} · ${value}${Number(promo.minSubtotal) > 0 ? ` dès ${eur(Number(promo.minSubtotal))}` : ""}`;
  return String(promo.bannerText || "").trim() || fallback;
}

/* ------------------------------------------------------------------ */
/* Formatage                                                          */
/* ------------------------------------------------------------------ */

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
export const eur = (v: number | undefined) => EUR.format(Number(v) || 0);

export const instagramHandle = (shop: Shop) => (shop.settings.instagram || "").replace(/^@/, "").trim();
export const instagramUrl = (shop: Shop) => {
  const h = instagramHandle(shop);
  return h ? `https://www.instagram.com/${encodeURIComponent(h)}/` : "";
};
