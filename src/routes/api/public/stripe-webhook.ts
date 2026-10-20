import { createFileRoute } from "@tanstack/react-router";
import { getShopData, verifyStripeSignature } from "@/lib/shop-server.server";
import type { PaidOrder } from "@/lib/mail.server";

type StripeWebhookEvent = {
  type?: string;
  data?: {
    object?: {
      id?: string;
      metadata?: { orderId?: string };
      payment_status?: string;
      payment_intent?: string | { id: string } | null;
    };
  };
};

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("webhook_not_configured", { status: 503 });
        if (Number(request.headers.get("content-length") ?? 0) > 1_000_000) {
          return new Response("payload_too_large", { status: 413 });
        }

        const payload = await request.text();
        if (new TextEncoder().encode(payload).byteLength > 1_000_000) {
          return new Response("payload_too_large", { status: 413 });
        }
        const valid = await verifyStripeSignature(
          payload,
          request.headers.get("stripe-signature"),
          secret,
        );
        if (!valid) return new Response("invalid_signature", { status: 401 });

        let event: StripeWebhookEvent;
        try {
          event = JSON.parse(payload) as StripeWebhookEvent;
        } catch {
          return new Response("invalid_payload", { status: 400 });
        }
        const session = event.data?.object;
        const orderId = session?.metadata?.orderId;
        const sessionId = session?.id;
        if (
          typeof orderId !== "string" ||
          !orderId ||
          typeof sessionId !== "string" ||
          !sessionId
        ) {
          return Response.json({ received: true });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          if (
            event.type === "checkout.session.completed" ||
            event.type === "checkout.session.async_payment_succeeded"
          ) {
            // Un paiement différé peut déclencher completed avant sa confirmation réelle.
            if (session.payment_status !== "paid")
              return Response.json({ received: true, pending: true });
            const paymentIntent =
              typeof session.payment_intent === "string" ? session.payment_intent : undefined;
            const { data, error } = await supabaseAdmin.rpc("finalize_order_stock", {
              p_order_id: String(orderId),
              p_session_id: String(sessionId),
              ...(paymentIntent === undefined ? {} : { p_payment_intent: paymentIntent }),
              p_manual: false,
            });
            if (error) return new Response("order_finalization_failed", { status: 503 });

            const result =
              data && typeof data === "object" && !Array.isArray(data)
                ? (data as { ok?: boolean; reason?: string; already_applied?: boolean })
                : null;
            if (!result?.ok) {
              console.warn("Stripe event did not match an order", {
                orderId: String(orderId),
                reason: result?.reason,
              });
              return new Response("order_finalization_failed", { status: 503 });
            }

            // L’appel SQL est idempotent : les notifications partent uniquement au premier paiement traité.
            if (!result.already_applied) {
              try {
                const [{ data: order }, shop] = await Promise.all([
                  supabaseAdmin
                    .from("orders")
                    .select("id, items, customer, subtotal, shipping, total")
                    .eq("id", String(orderId))
                    .maybeSingle(),
                  getShopData(),
                ]);
                if (order && shop) {
                  const { notifyPaidOrder } = await import("@/lib/mail.server");
                  await notifyPaidOrder(order as unknown as PaidOrder, shop);
                }
              } catch {
                // Un e-mail raté ne doit jamais faire échouer ou retraiter le paiement.
              }
            }
          } else if (event.type === "checkout.session.expired") {
            const { error } = await supabaseAdmin
              .from("orders")
              .update({ status: "Expirée" })
              .eq("id", String(orderId))
              .eq("stripe_session_id", String(sessionId))
              .eq("status", "En attente de paiement");
            if (error) return new Response("order_update_failed", { status: 503 });
          } else if (event.type === "checkout.session.async_payment_failed") {
            const { error } = await supabaseAdmin
              .from("orders")
              .update({ status: "Annulée" })
              .eq("id", String(orderId))
              .eq("stripe_session_id", String(sessionId))
              .eq("status", "En attente de paiement");
            if (error) return new Response("order_update_failed", { status: 503 });
          }
          return Response.json({ received: true });
        } catch {
          return new Response("webhook_processing_failed", { status: 503 });
        }
      },
    },
  },
});
