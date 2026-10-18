import { createFileRoute } from "@tanstack/react-router";
import { getShopData, verifyStripeSignature } from "@/lib/shop-server.server";

function isSet(p: any) {
  return p?.category === "ensemble" && Array.isArray(p?.components);
}

// Décrémente le stock des tailles achetées dans les données de la boutique.
function decrementStock(shop: any, items: { id: string; size: string; qty: number }[]): boolean {
  const products: any[] = shop?.products ?? [];
  let changed = false;
  const dec = (p: any, size: string, qty: number) => {
    if (p && p.sizes && size in p.sizes) {
      p.sizes[size] = Math.max(0, Number(p.sizes[size]) - qty);
      changed = true;
    }
  };
  for (const it of items) {
    const p = products.find((x: any) => x.id === it.id);
    if (!p) continue;
    if (isSet(p)) {
      const [a, b] = String(it.size).split(" / ");
      const comps = p.components.map((c: any) => products.find((x: any) => x.id === c.id));
      if (a && b && comps[0] && comps[1]) {
        dec(comps[0], a, it.qty);
        dec(comps[1], b, it.qty);
      }
    } else {
      dec(p, it.size, it.qty);
    }
  }
  return changed;
}

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("webhook_not_configured", { status: 503 });

        const payload = await request.text();
        const ok = await verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret);
        if (!ok) return new Response("invalid_signature", { status: 401 });

        let event: any;
        try {
          event = JSON.parse(payload);
        } catch {
          return new Response("invalid_payload", { status: 400 });
        }

        const session = event?.data?.object;
        const orderId = session?.metadata?.orderId;
        if (!orderId) return Response.json({ received: true });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (event.type === "checkout.session.completed") {
          const { data: order } = await supabaseAdmin.from("orders").select("status, items").eq("id", orderId).maybeSingle();
          await supabaseAdmin
            .from("orders")
            .update({ status: "Payée", payment_intent: session.payment_intent ?? null })
            .eq("id", orderId);

          // Stock décrémenté une seule fois (si la commande n'était pas déjà payée).
          if (order && order.status !== "Payée" && Array.isArray(order.items)) {
            const shop = await getShopData();
            if (shop && decrementStock(shop, order.items)) {
              await supabaseAdmin.from("shop_data").upsert({ id: 1, data: shop, updated_at: new Date().toISOString() });
            }
          }
          // TODO: e-mail de confirmation client + notification (nécessite un service d'e-mails).
        } else if (event.type === "checkout.session.expired") {
          await supabaseAdmin.from("orders").update({ status: "Expirée" }).eq("id", orderId).eq("status", "En attente de paiement");
        }

        return Response.json({ received: true });
      },
    },
  },
});
