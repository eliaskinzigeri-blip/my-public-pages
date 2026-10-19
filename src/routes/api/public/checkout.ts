import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkOrigin, getShopData, rateLimit, stripeApi } from "@/lib/shop-server.server";

const itemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  size: z.string().trim().min(1).max(40),
  qty: z.number().int().min(1).max(10),
});
const bodySchema = z.object({
  orderId: z.string().regex(/^[A-Za-z0-9_-]{8,60}$/),
  customer: z.object({
    email: z.string().trim().email().max(120),
    phone: z.string().trim().max(30).optional().default(""),
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(200),
    zip: z.string().trim().min(1).max(20),
    city: z.string().trim().min(1).max(80),
    country: z.string().trim().min(1).max(80),
  }),
  items: z.array(itemSchema).min(1).max(50),
  promoCode: z.string().trim().max(40).optional().default(""),
});

function normalizePromoCode(value: unknown): string {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}
function invalidPromo(message: string): Response {
  return Response.json({ error: "invalid_promo", message }, { status: 400 });
}
function isSet(product: any): boolean {
  return product?.category === "ensemble" && Array.isArray(product?.components);
}
function stockOf(products: any[], product: any, size: string): number {
  if (!product) return 0;
  if (isSet(product)) {
    const [first, second] = String(size).split(" / ");
    const components = product.components.map((component: any) =>
      products.find((candidate: any) => candidate.id === (typeof component === "string" ? component : component?.id)),
    );
    if (!first || !second || components.some((component: any) => !component)) return 0;
    return Math.min(stockOf(products, components[0], first), stockOf(products, components[1], second));
  }
  const stock = Number(product.sizes?.[size] ?? 0);
  return Number.isFinite(stock) ? Math.max(0, stock) : 0;
}
function displaySize(product: any, size: string): string {
  if (!isSet(product)) return size;
  const [sweat, jogging] = size.split(" / ");
  return `Sweat ${sweat} · Jogging ${jogging}`;
}
function sameRequest(existing: any, orderId: string, customer: any, items: any[], subtotal: number, shipping: number, total: number, promoCode: string, discount: number): boolean {
  if (!existing || existing.id !== orderId) return false;
  const oldItems = Array.isArray(existing.items) ? existing.items.map((item: any) => ({ id: item.id, size: item.size, qty: item.qty })) : [];
  const requestedItems = items.map((item: any) => ({ id: item.id, size: item.size, qty: item.qty }));
  if (JSON.stringify(oldItems) !== JSON.stringify(requestedItems)) return false;
  const oldCustomer = existing.customer ?? {};
  const customerKeys = ["email", "phone", "name", "address", "zip", "city", "country"];
  if (customerKeys.some((key) => String(oldCustomer[key] ?? "") !== String(customer[key] ?? ""))) return false;
  if (normalizePromoCode(oldCustomer.promoCode) !== promoCode) return false;
  if (Math.round(Number(oldCustomer.promoDiscount ?? 0) * 100) !== discount) return false;
  return Math.round(Number(existing.subtotal ?? 0) * 100) === subtotal
    && Math.round(Number(existing.shipping ?? 0) * 100) === shipping
    && Math.round(Number(existing.total ?? 0) * 100) === total;
}

export const Route = createFileRoute("/api/public/checkout")({
  server: {
    handlers: {
      GET: async () => Response.json({ enabled: !!process.env["STRIPE_SECRET_KEY"] }),

      POST: async ({ request }) => {
        if (!checkOrigin(request)) return Response.json({ error: "bad_origin" }, { status: 403 });
        if (!rateLimit(request, 8)) return Response.json({ error: "rate_limited" }, { status: 429 });
        const declaredSize = Number(request.headers.get("content-length") ?? 0);
        if (declaredSize > 32_000) return Response.json({ error: "payload_too_large" }, { status: 413 });

        let parsed: z.infer<typeof bodySchema>;
        try {
          const raw = await request.text();
          if (new TextEncoder().encode(raw).byteLength > 32_000) return Response.json({ error: "payload_too_large" }, { status: 413 });
          parsed = bodySchema.parse(JSON.parse(raw));
        } catch {
          return Response.json({ error: "invalid_body" }, { status: 400 });
        }
        const { orderId, customer } = parsed;
        const requestedCode = normalizePromoCode(parsed.promoCode);
        const stripeEnabled = !!process.env["STRIPE_SECRET_KEY"];

        const shop = await getShopData();
        const products: any[] = shop?.products ?? [];
        const settings = shop?.settings ?? {};
        const hasManualChannel = [settings.contactEmail, settings.instagram, settings.paymentLink]
          .some((value) => typeof value === "string" && value.trim().length > 0);
        if (!stripeEnabled && !hasManualChannel) {
          return Response.json({ error: "order_channel_not_configured" }, { status: 503 });
        }

        // Combine duplicate cart lines before checking stock, so a crafted request cannot oversell a size.
        const combined = new Map<string, { id: string; size: string; qty: number }>();
        for (const item of parsed.items) {
          const key = `${item.id}\u0000${item.size}`;
          const current = combined.get(key);
          const qty = (current?.qty ?? 0) + item.qty;
          if (qty > 10) return Response.json({ error: "quantity_limit" }, { status: 400 });
          combined.set(key, { id: item.id, size: item.size, qty });
        }
        const items = [...combined.values()];

        const priced: { it: (typeof items)[number]; product: any; cents: number; amount: number; discount: number }[] = [];
        let subtotalCents = 0;
        for (const item of items) {
          const product = products.find((candidate: any) => candidate.id === item.id && candidate.active !== false);
          if (!product) return Response.json({ error: "unknown_product" }, { status: 400 });
          if (stockOf(products, product, item.size) < item.qty) return Response.json({ error: "out_of_stock" }, { status: 400 });
          const price = Number(product.price);
          if (!Number.isFinite(price) || price < 0) return Response.json({ error: "invalid_product_price" }, { status: 400 });
          const cents = Math.round(price * 100);
          const amount = cents * item.qty;
          subtotalCents += amount;
          priced.push({ it: item, product, cents, amount, discount: 0 });
        }

        let promo: any = null;
        let promoCode = "";
        let discountCents = 0;
        if (requestedCode) {
          promo = (shop?.promos ?? []).find((candidate: any) => candidate?.active === true && normalizePromoCode(candidate.code) === requestedCode);
          if (!promo) return invalidPromo("Code promo invalide ou inactif.");
          promoCode = normalizePromoCode(promo.code);
          const minimumValue = Number(promo.minSubtotal ?? 0);
          if (!Number.isFinite(minimumValue) || minimumValue < 0) return invalidPromo("Ce code promo n'est pas correctement configuré.");
          const minimumCents = Math.round(minimumValue * 100);
          if (subtotalCents < minimumCents) {
            return invalidPromo(`Ce code est valable dès ${(minimumCents / 100).toFixed(2).replace(".", ",")} € d'achat.`);
          }
          const productIds: string[] = Array.isArray(promo.productIds) ? promo.productIds : [];
          const eligible = priced.filter((row) => promo.appliesToAll !== false || productIds.includes(row.it.id));
          const eligibleCents = eligible.reduce((sum, row) => sum + row.amount, 0);
          if (eligibleCents <= 0) return invalidPromo("Ce code ne s'applique à aucun article de ton panier.");
          const value = Number(promo.value);
          if (!Number.isFinite(value) || value <= 0) return invalidPromo("Ce code promo n'est pas encore configuré.");
          discountCents = Math.min(eligibleCents, Math.round(promo.discountType === "percent" ? eligibleCents * Math.min(100, value) / 100 : value * 100));
          if (discountCents <= 0) return invalidPromo("Ce code promo n'est pas encore configuré.");

          // Répartir la remise au centime près sur les lignes éligibles.
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

        const freeFrom = Number(settings.freeFrom ?? 0);
        const shippingCents = freeFrom > 0 && subtotalCents >= freeFrom * 100
          ? 0
          : Math.max(0, Math.round(Number(settings.shipping ?? 0) * 100));
        const totalCents = subtotalCents - discountCents + shippingCents;
        const storedCustomer = {
          ...customer,
          ...(promo ? { promoCode, promoDiscount: discountCents / 100 } : {}),
        };
        const orderItems = priced.map(({ it, product, cents }) => ({
          id: it.id,
          name: String(product.name ?? "Article"),
          size: it.size,
          displaySize: displaySize(product, it.size),
          qty: it.qty,
          price: cents / 100,
        }));

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: existing, error: existingError } = await supabaseAdmin
          .from("orders")
          .select("id, status, customer, items, subtotal, shipping, total, session_url, stripe_session_id")
          .eq("id", orderId)
          .maybeSingle();
        if (existingError) return Response.json({ error: "order_lookup_failed" }, { status: 503 });
        if (existing) {
          if (!sameRequest(existing, orderId, customer, items, subtotalCents, shippingCents, totalCents, promoCode, discountCents)) {
            return Response.json({ error: "order_id_conflict" }, { status: 409 });
          }
          if (["Payée", "Expédiée", "Livrée"].includes(existing.status)) {
            return Response.json({ error: "order_already_completed" }, { status: 409 });
          }
          if (existing.status === "À confirmer" && !existing.stripe_session_id && !stripeEnabled) {
            return Response.json({ manual: true, orderId, status: existing.status });
          }
          if (existing.stripe_session_id && existing.session_url) {
            if (!stripeEnabled) return Response.json({ error: "stripe_not_configured" }, { status: 503 });
            try {
              const oldSession = await stripeApi(`/v1/checkout/sessions/${encodeURIComponent(existing.stripe_session_id)}`, "GET");
              if (oldSession.status === "open" || oldSession.status === "complete") return Response.json({ url: existing.session_url });
            } catch {
              return Response.json({ error: "payment_provider_error" }, { status: 502 });
            }
          }
        }

        if (!stripeEnabled) {
          const { error } = await supabaseAdmin.from("orders").upsert({
            id: orderId,
            status: "À confirmer",
            customer: storedCustomer,
            items: orderItems,
            subtotal: subtotalCents / 100,
            shipping: shippingCents / 100,
            total: totalCents / 100,
            stripe_session_id: null,
            session_url: null,
          });
          if (error) return Response.json({ error: "order_save_failed" }, { status: 503 });
          return Response.json({ manual: true, orderId, status: "À confirmer" });
        }

        const lineItems: Record<string, string> = {};
        let index = 0;
        const addLine = (qty: number, cents: number, name: string) => {
          if (qty <= 0 || cents <= 0) return;
          const key = String(index++);
          lineItems[`line_items[${key}][quantity]`] = String(qty);
          lineItems[`line_items[${key}][price_data][currency]`] = "eur";
          lineItems[`line_items[${key}][price_data][unit_amount]`] = String(cents);
          lineItems[`line_items[${key}][price_data][product_data][name]`] = name;
        };
        for (const row of priced) {
          const perUnitDiscount = Math.floor(row.discount / row.it.qty);
          const extraDiscountedUnits = row.discount % row.it.qty;
          const regularUnits = row.it.qty - extraDiscountedUnits;
          const label = `${row.product.name} — ${row.it.size}`;
          addLine(regularUnits, row.cents - perUnitDiscount, label);
          addLine(extraDiscountedUnits, row.cents - perUnitDiscount - 1, label);
        }
        if (shippingCents > 0) addLine(1, shippingCents, "Livraison");
        if (index === 0 || totalCents <= 0) {
          return requestedCode
            ? invalidPromo("Cette remise rendrait la commande gratuite, ce qui n'est pas encore pris en charge par le paiement en ligne.")
            : Response.json({ error: "order_total_zero" }, { status: 400 });
        }

        const origin = new URL(request.url).origin;
        let session: any;
        try {
          session = await stripeApi("/v1/checkout/sessions", "POST", {
            mode: "payment",
            customer_email: customer.email,
            client_reference_id: orderId,
            success_url: `${origin}/?paid=1&order=${orderId}#/commande/${orderId}`,
            cancel_url: `${origin}/#/checkout`,
            "metadata[orderId]": orderId,
            ...(promo ? { "metadata[promoCode]": promoCode, "metadata[discountCents]": String(discountCents) } : {}),
            ...lineItems,
          });
        } catch {
          return Response.json({ error: "payment_provider_error" }, { status: 502 });
        }
        if (typeof session?.url !== "string" || typeof session?.id !== "string") {
          return Response.json({ error: "payment_provider_error" }, { status: 502 });
        }

        const { error } = await supabaseAdmin.from("orders").upsert({
          id: orderId,
          status: "En attente de paiement",
          customer: storedCustomer,
          items: orderItems,
          subtotal: subtotalCents / 100,
          shipping: shippingCents / 100,
          total: totalCents / 100,
          stripe_session_id: session.id,
          session_url: session.url,
        });
        if (error) return Response.json({ error: "order_save_failed" }, { status: 503 });
        return Response.json({ url: session.url });
      },
    },
  },
});
