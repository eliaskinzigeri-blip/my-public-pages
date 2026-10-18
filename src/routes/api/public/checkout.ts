import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkOrigin, getShopData, rateLimit, stripeApi } from "@/lib/shop-server.server";

const itemSchema = z.object({ id: z.string().min(1).max(80), size: z.string().min(1).max(40), qty: z.number().int().min(1).max(10) });
const bodySchema = z.object({
  orderId: z.string().min(4).max(60),
  customer: z.object({
    email: z.string().email().max(120),
    phone: z.string().max(30).optional().default(""),
    name: z.string().min(1).max(120),
    address: z.string().min(1).max(200),
    zip: z.string().min(1).max(20),
    city: z.string().min(1).max(80),
    country: z.string().min(1).max(80),
  }),
  items: z.array(itemSchema).min(1).max(20),
  promoCode: z.string().max(40).optional().default(""),
});

function normalizePromoCode(value: unknown): string {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}
function invalidPromo(message: string): Response {
  return Response.json({ error: "invalid_promo", message }, { status: 400 });
}
function isSet(p: any) {
  return p?.category === "ensemble" && Array.isArray(p?.components);
}
function stockOf(products: any[], p: any, size: string): number {
  if (!p) return 0;
  if (isSet(p)) {
    const [a, b] = String(size).split(" / ");
    const comps = p.components.map((c: any) => products.find((x: any) => x.id === (typeof c === "string" ? c : c.id)));
    if (!a || !b || comps.some((c: any) => !c)) return 0;
    return Math.min(stockOf(products, comps[0], a), stockOf(products, comps[1], b));
  }
  return Math.max(0, Number(p.sizes?.[size] ?? 0));
}

type PricedItem = { it: z.infer<typeof itemSchema>; p: any; cents: number; amount: number; discount: number };

export const Route = createFileRoute("/api/public/checkout")({
  server: {
    handlers: {
      GET: async () => Response.json({ enabled: !!process.env["STRIPE_SECRET_KEY"] }),

      POST: async ({ request }) => {
        if (!process.env["STRIPE_SECRET_KEY"]) return Response.json({ error: "stripe_not_configured" }, { status: 503 });
        if (!checkOrigin(request)) return Response.json({ error: "bad_origin" }, { status: 403 });
        if (!rateLimit(request, 10)) return Response.json({ error: "rate_limited" }, { status: 429 });

        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid_body" }, { status: 400 });
        }
        const { orderId, customer, items } = parsed;
        const requestedCode = normalizePromoCode(parsed.promoCode);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Même orderId deux fois → réutiliser la session existante.
        const { data: existing } = await supabaseAdmin.from("orders").select("status, session_url").eq("id", orderId).maybeSingle();
        if (existing?.session_url && existing.status === "En attente de paiement") {
          return Response.json({ url: existing.session_url });
        }

        // Recharge les produits et promos côté serveur : aucun prix ni remise client n'est accepté.
        const shop = await getShopData();
        const products: any[] = shop?.products ?? [];
        const settings = shop?.settings ?? {};

        const priced: PricedItem[] = [];
        let subtotalCents = 0;
        for (const it of items) {
          const product = products.find((x: any) => x.id === it.id && x.active !== false);
          if (!product) return Response.json({ error: "unknown_product", id: it.id }, { status: 400 });
          if (stockOf(products, product, it.size) < it.qty) return Response.json({ error: "out_of_stock", id: it.id }, { status: 400 });
          const cents = Math.max(0, Math.round(Number(product.price) * 100));
          const amount = cents * it.qty;
          subtotalCents += amount;
          priced.push({ it, p: product, cents, amount, discount: 0 });
        }

        let promo: any = null;
        let promoCode = "";
        let discountCents = 0;
        if (requestedCode) {
          promo = (shop?.promos ?? []).find((candidate: any) => candidate?.active === true && normalizePromoCode(candidate.code) === requestedCode);
          if (!promo) return invalidPromo("Code promo invalide ou inactif.");
          promoCode = normalizePromoCode(promo.code);

          const minimumCents = Math.max(0, Math.round(Number(promo.minSubtotal ?? 0) * 100));
          if (subtotalCents < minimumCents) {
            return invalidPromo(`Ce code est valable dès ${(minimumCents / 100).toFixed(2).replace(".", ",")} € d'achat.`);
          }

          const productIds: string[] = Array.isArray(promo.productIds) ? promo.productIds : [];
          const eligible = priced.filter((row) => promo.appliesToAll !== false || productIds.includes(row.it.id));
          const eligibleCents = eligible.reduce((sum, row) => sum + row.amount, 0);
          if (eligibleCents <= 0) return invalidPromo("Ce code ne s'applique à aucun article de ton panier.");

          const value = Math.max(0, Number(promo.value) || 0);
          if (value <= 0) return invalidPromo("Ce code promo n'est pas encore configuré.");
          discountCents = Math.min(
            eligibleCents,
            Math.round(promo.discountType === "percent" ? eligibleCents * Math.min(100, value) / 100 : value * 100),
          );
          if (discountCents <= 0) return invalidPromo("Ce code promo n'est pas encore configuré.");

          // Répartir une remise fixe au prorata des lignes, en gardant un total au centime près.
          const shares = eligible.map((row) => {
            const exact = discountCents * row.amount / eligibleCents;
            const whole = Math.floor(exact);
            return { row, whole, fraction: exact - whole };
          });
          let remaining = discountCents - shares.reduce((sum, share) => sum + share.whole, 0);
          const ranked = [...shares].sort((a, b) => b.fraction - a.fraction);
          for (let i = 0; i < remaining && ranked.length > 0; i++) {
            const share = ranked[i % ranked.length];
            if (share) share.whole++;
          }
          for (const share of shares) share.row.discount = share.whole;
        }

        const lineItems: Record<string, string> = {};
        let idx = 0;
        const addLine = (qty: number, cents: number, name: string) => {
          if (qty <= 0 || cents <= 0) return;
          const n = String(idx++);
          lineItems[`line_items[${n}][quantity]`] = String(qty);
          lineItems[`line_items[${n}][price_data][currency]`] = "eur";
          lineItems[`line_items[${n}][price_data][unit_amount]`] = String(cents);
          lineItems[`line_items[${n}][price_data][product_data][name]`] = name;
        };
        for (const row of priced) {
          const perUnitDiscount = Math.floor(row.discount / row.it.qty);
          const extraDiscountedUnits = row.discount % row.it.qty;
          const regularUnits = row.it.qty - extraDiscountedUnits;
          const label = `${row.p.name} — ${row.it.size}`;
          addLine(regularUnits, row.cents - perUnitDiscount, label);
          addLine(extraDiscountedUnits, row.cents - perUnitDiscount - 1, label);
        }

        const freeFrom = Number(settings.freeFrom ?? 0);
        const shippingCents = freeFrom > 0 && subtotalCents >= freeFrom * 100 ? 0 : Math.max(0, Math.round(Number(settings.shipping ?? 0) * 100));
        if (shippingCents > 0) addLine(1, shippingCents, "Livraison");
        const totalCents = subtotalCents - discountCents + shippingCents;
        if (idx === 0 || totalCents <= 0) {
          return requestedCode
            ? invalidPromo("Cette remise rendrait la commande gratuite, ce qui n'est pas encore pris en charge par le paiement en ligne.")
            : Response.json({ error: "order_total_zero" }, { status: 400 });
        }

        const origin = new URL(request.url).origin;
        const session = await stripeApi("/v1/checkout/sessions", "POST", {
          mode: "payment",
          customer_email: customer.email,
          success_url: `${origin}/?paid=1&order=${orderId}#/commande/${orderId}`,
          cancel_url: `${origin}/#/checkout`,
          "metadata[orderId]": orderId,
          ...(promo ? { "metadata[promoCode]": promoCode, "metadata[discountCents]": String(discountCents) } : {}),
          ...lineItems,
        });

        const storedCustomer = promo ? { ...customer, promoCode, promoDiscount: discountCents / 100 } : customer;
        const { error } = await supabaseAdmin.from("orders").upsert({
          id: orderId,
          status: "En attente de paiement",
          customer: storedCustomer,
          items,
          subtotal: subtotalCents / 100,
          shipping: shippingCents / 100,
          total: totalCents / 100,
          stripe_session_id: session.id,
          session_url: session.url,
        });
        if (error) return Response.json({ error: error.message }, { status: 500 });

        return Response.json({ url: session.url });
      },
    },
  },
});
