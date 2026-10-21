/*
 * Constantes du site et aides SEO (balises <head>, données structurées).
 * L'URL publique peut être remplacée par un domaine personnalisé via la
 * variable d'environnement VITE_SITE_URL (ex. https://whitesayy.com).
 */
import {
  type Product,
  type Shop,
  categoryById,
  compareAt,
  fullName,
  isSet,
  partsOf,
  reviewsFor,
  averageRating,
  stockOf,
  sizesOf,
  totalStock,
  instagramUrl,
} from "./catalog";
import { imageUrl } from "./images";

const envUrl = (import.meta.env?.VITE_SITE_URL as string | undefined) || "";
export const SITE_URL = (envUrl || "https://whitesayy.lovable.app").replace(/\/+$/, "");
export const SITE_NAME = "WHITE SAYY";
export const DEFAULT_TITLE = "WHITE SAYY — Marque streetwear | T-shirts, sweats & ensembles";
export const DEFAULT_DESCRIPTION =
  "Découvrez WHITE SAYY, marque streetwear au design brut et noir profond. T-shirts oversize, sweats zippés à capuche, joggings et ensembles du XS au XXL.";
export const OG_IMAGE = "/images/og-white-sayy.jpg";

export const absolute = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

type SeoInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "product" | "article";
  noindex?: boolean;
};

/** Balises <head> complètes pour une page : titre, description, canonique, Open Graph, Twitter. */
export function seo({ title, description, path, image, imageAlt, type = "website", noindex }: SeoInput) {
  const url = absolute(path);
  const img = absolute(image || OG_IMAGE);
  const isDefaultImage = !image || image === OG_IMAGE;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      ...(noindex ? [{ name: "robots", content: "noindex, follow" }] : [{ name: "robots", content: "index, follow, max-image-preview:large" }]),
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:type", content: type === "product" ? "product" : type },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: img },
      ...(isDefaultImage
        ? [
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
          ]
        : []),
      { property: "og:image:alt", content: imageAlt || "WHITE SAYY — marque streetwear" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: img },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export const jsonLd = (data: unknown) => ({ type: "application/ld+json", children: JSON.stringify(data) });

export function organizationLd(shop: Shop) {
  const ig = instagramUrl(shop);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: absolute("/images/logo.png"),
    description: DEFAULT_DESCRIPTION,
    ...(ig ? { sameAs: [ig] } : {}),
    ...(shop.settings.contactEmail
      ? { contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: shop.settings.contactEmail, availableLanguage: ["fr"] } }
      : {}),
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: "fr-FR",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/boutique?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absolute(it.path) })),
  };
}

export function itemListLd(products: Product[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absolute(`/produit/${p.id}`),
      name: fullName(p),
    })),
  };
}

const shippingDetails = (shop: Shop) => ({
  "@type": "OfferShippingDetails",
  shippingRate: { "@type": "MonetaryAmount", value: Number(shop.settings.shipping) || 0, currency: "EUR" },
  shippingDestination: { "@type": "DefinedRegion", addressCountry: "FR" },
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
    transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 5, unitCode: "DAY" },
  },
});

const returnPolicy = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "FR",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 14,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
};

export function productLd(shop: Shop, p: Product) {
  const cat = categoryById(p.category);
  const revs = reviewsFor(shop, p.id);
  const inStock = totalStock(shop, p) > 0;
  const priceValidUntil = `${new Date().getFullYear() + 1}-12-31`;
  const sizes = isSet(p) ? [] : sizesOf(p);
  const color = p.tagline || undefined;
  const images = p.images.slice(0, 6).map((k) => absolute(imageUrl(k, 1200)));
  const offer = {
    "@type": "Offer",
    url: absolute(`/produit/${p.id}`),
    priceCurrency: "EUR",
    price: Number(p.price).toFixed(2),
    priceValidUntil,
    availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": `${SITE_URL}/#organization` },
    shippingDetails: shippingDetails(shop),
    hasMerchantReturnPolicy: returnPolicy,
  };
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": sizes.length ? "ProductGroup" : "Product",
    name: fullName(p),
    description: p.description,
    image: images,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: cat?.singular,
    color,
    audience: { "@type": "PeopleAudience", suggestedGender: "unisex", suggestedMinAge: 13 },
    url: absolute(`/produit/${p.id}`),
  };
  if (sizes.length) {
    ld.productGroupID = p.id;
    ld.variesBy = ["https://schema.org/size"];
    ld.hasVariant = sizes.map((s) => ({
      "@type": "Product",
      sku: `${p.id}-${s}`.toUpperCase(),
      name: `${fullName(p)} — taille ${s}`,
      size: s,
      color,
      image: images[0],
      offers: { ...offer, availability: stockOf(shop, p, s) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
    }));
  } else {
    ld.sku = p.id.toUpperCase();
    ld.offers = offer;
    if (isSet(p)) {
      const parts = partsOf(shop, p).filter(Boolean) as Product[];
      ld.isRelatedTo = parts.map((c) => ({ "@type": "Product", name: fullName(c), url: absolute(`/produit/${c.id}`) }));
      const ref = compareAt(shop, p);
      if (ref > p.price) ld.description = `${p.description} Prix de l'ensemble : ${p.price.toFixed(2)} € au lieu de ${ref.toFixed(2)} € à l'unité.`;
    }
  }
  if (revs.length) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: averageRating(revs).toFixed(1),
      reviewCount: revs.length,
      bestRating: 5,
      worstRating: 1,
    };
    ld.review = revs.slice(0, 5).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.name || "Client" },
      reviewRating: { "@type": "Rating", ratingValue: Number(r.rating) || 5, bestRating: 5 },
      reviewBody: r.text,
      ...(r.date ? { datePublished: r.date.slice(0, 10) } : {}),
    }));
  }
  return ld;
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
  };
}
