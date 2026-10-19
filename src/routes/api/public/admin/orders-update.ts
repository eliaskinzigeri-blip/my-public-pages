import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkAdmin, checkOrigin, rateLimit } from "@/lib/shop-server.server";

const STATUSES = ["À confirmer", "En attente de paiement", "Payée", "Expédiée", "Livrée", "Expirée", "Annulée"] as const;
const bodySchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(120),
  id: z.string().min(8).max(60),
  status: z.enum(STATUSES),
  tracking: z.string().trim().max(120).optional().default(""),
}).strict();

export const Route = createFileRoute("/api/public/admin/orders-update")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkOrigin(request)) return Response.json({ error: "bad_origin" }, { status: 403 });
        if (!rateLimit(request, 20)) return Response.json({ error: "rate_limited" }, { status: 429 });
        let body: z.infer<typeof bodySchema>;
        try {
          const raw = await request.text();
          if (new TextEncoder().encode(raw).byteLength > 16_000) return Response.json({ error: "payload_too_large" }, { status: 413 });
          body = bodySchema.parse(JSON.parse(raw));
        } catch {
          return Response.json({ error: "invalid_body" }, { status: 400 });
        }
        if (!(await checkAdmin(body.email, body.password))) return Response.json({ error: "unauthorized" }, { status: 401 });
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: order, error: lookupError } = await supabaseAdmin.from("orders")
            .select("id, status, stripe_session_id").eq("id", body.id).maybeSingle();
          if (lookupError) return Response.json({ error: "order_lookup_failed" }, { status: 503 });
          if (!order) return Response.json({ error: "not_found" }, { status: 404 });

          if (body.status === "Payée") {
            if (order.status === "Payée") return Response.json({ ok: true, alreadyPaid: true });
            if (order.stripe_session_id) return Response.json({ error: "stripe_payment_must_be_verified" }, { status: 409 });
            const { data, error } = await supabaseAdmin.rpc("finalize_order_stock", {
              p_order_id: body.id,
              p_session_id: null,
              p_payment_intent: null,
              p_manual: true,
            });
            if (error) return Response.json({ error: "payment_status_save_failed" }, { status: 503 });
            const result = data && typeof data === "object" && !Array.isArray(data) ? data as { ok?: boolean; reason?: string } : null;
            if (!result?.ok) return Response.json({ error: result?.reason || "payment_status_conflict" }, { status: 409 });
            return Response.json({ ok: true });
          }

          if (body.status === "Expédiée" && !["Payée", "Expédiée", "Livrée"].includes(order.status)) {
            return Response.json({ error: "order_not_paid" }, { status: 409 });
          }
          if (body.status === "Livrée" && !["Expédiée", "Livrée"].includes(order.status)) {
            return Response.json({ error: "order_not_shipped" }, { status: 409 });
          }
          if (["Annulée", "Expirée"].includes(body.status) && ["Payée", "Expédiée", "Livrée"].includes(order.status)) {
            return Response.json({ error: "order_already_paid" }, { status: 409 });
          }

          const { data, error } = await supabaseAdmin.from("orders")
            .update({ status: body.status, tracking: body.tracking || null })
            .eq("id", body.id).select("id").maybeSingle();
          if (error) return Response.json({ error: "order_update_failed" }, { status: 503 });
          if (!data) return Response.json({ error: "not_found" }, { status: 404 });
          return Response.json({ ok: true });
        } catch {
          return Response.json({ error: "order_update_failed" }, { status: 503 });
        }
      },
    },
  },
});
