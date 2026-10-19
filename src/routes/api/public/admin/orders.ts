import { createFileRoute } from "@tanstack/react-router";
import { checkAdmin, checkOrigin, rateLimit } from "@/lib/shop-server.server";

export const Route = createFileRoute("/api/public/admin/orders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkOrigin(request)) return Response.json({ error: "bad_origin" }, { status: 403 });
        if (!rateLimit(request, 20)) return Response.json({ error: "rate_limited" }, { status: 429 });
        let body: { email?: string; password?: string };
        try {
          const raw = await request.text();
          if (new TextEncoder().encode(raw).byteLength > 16_000) return Response.json({ error: "payload_too_large" }, { status: 413 });
          body = JSON.parse(raw);
          if (typeof body.email !== "string" || typeof body.password !== "string") return Response.json({ error: "invalid_body" }, { status: 400 });
        } catch {
          return Response.json({ error: "invalid_body" }, { status: 400 });
        }
        if (!(await checkAdmin(body.email, body.password))) return Response.json({ error: "unauthorized" }, { status: 401 });
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
          if (error) return Response.json({ error: "orders_unavailable" }, { status: 503 });
          const orders = (data ?? []).map((order: any) => ({
            id: order.id,
            date: order.created_at,
            status: order.status,
            customer: order.customer,
            items: order.items,
            subtotal: order.subtotal,
            shipping: order.shipping,
            total: order.total,
            tracking: order.tracking,
            manualOrder: !order.stripe_session_id,
          }));
          return Response.json({ orders });
        } catch {
          return Response.json({ error: "orders_unavailable" }, { status: 503 });
        }
      },
    },
  },
});
