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
});

function isSet(p: any) {
  return p?.category === "ensemble" && Array.isArray(p?.components);
}
function stockOf(products: any[], p: any, size: string): number {
  if (!p) return 0;
  if (isSet(p)) {
    const [a, b] = String(size).split(" / ");
    const comps = p.components.map((c: any) => products.find((x: any) => x.id === c.id));
    if (!a || !b || comps.some((c: any) => !c)) return 0;
    return Math.min(stockOf(products, comps[0], a), stockOf(products, comps[1], b));
  }
  return Math.max(0, Number(p.sizes?.[size] ?? 0));
}

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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Même orderId deux fois → réutiliser la session existante.
        const { data: existing } = await supabaseAdmin.from("orders").select("status, session_url").eq("id", orderId).maybeSingle();
        if (existing?.session_url && existing.status === "En attente de paiement") {
          return Response.json({ url: existing.session_url });
        }

        // Recharge les produits côté serveur : aucun prix client n'est accepté.
        const shop = await getShopData();
        const products: any[] = shop?.products ?? [];
        const settings = shop?.settings ?? {};

        const lineItems: Record<string, string> = {};
        let subtotal = 0;
        let idx = 0;
        for (const it of items) {
          const p = products.find((x: any) => x.id === it.id && x.active !== false);
          if (!p) return Response.json({ error: "unknown_product", id: it.id }, { status: 400 });
          if (stockOf(products, p, it.size) < it.qty) return Response.json({ error: "out_of_stock", id: it.id }, { status: 400 });
          const cents = Math.round(Number(p.price) * 100);
          subtotal += cents * it.qty;
          const n = String(idx++);
          lineItems[`line_items[${n}][quantity]`] = String(it.qty);
          lineItems[`line_items[${n}][price_data][currency]`] = "eur";
          lineItems[`line_items[${n}][price_data][unit_amount]`] = String(cents);
          lineItems[`line_items[${n}][price_data][product_data][name]`] = `${p.name} — ${it.size}`;
        }

        const freeFrom = Number(settings.freeFrom ?? 0);
        const shippingCents = freeFrom > 0 && subtotal >= freeFrom * 100 ? 0 : Math.round(Number(settings.shipping ?? 0) * 100);
        if (shippingCents > 0) {
          const n = String(idx++);
          lineItems[`line_items[${n}][quantity]`] = "1";
          lineItems[`line_items[${n}][price_data][currency]`] = "eur";
          lineItems[`line_items[${n}][price_data][unit_amount]`] = String(shippingCents);
          lineItems[`line_items[${n}][price_data][product_data][name]`] = "Livraison";
        }

        const origin = new URL(request.url).origin;
        const session = await stripeApi("/v1/checkout/sessions", "POST", {
          mode: "payment",
          customer_email: customer.email,
          success_url: `${origin}/?paid=1&order=${orderId}#/commande/${orderId}`,
          cancel_url: `${origin}/#/checkout`,
          "metadata[orderId]": orderId,
          ...lineItems,
        });

        const { error } = await supabaseAdmin.from("orders").upsert({
          id: orderId,
          status: "En attente de paiement",
          customer,
          items,
          subtotal: subtotal / 100,
          shipping: shippingCents / 100,
          total: (subtotal + shippingCents) / 100,
          stripe_session_id: session.id,
          session_url: session.url,
        });
        if (error) return Response.json({ error: error.message }, { status: 500 });

        return Response.json({ url: session.url });
      },
    },
  },
});
