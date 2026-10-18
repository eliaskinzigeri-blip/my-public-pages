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
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_body" }, { status: 400 });
        }
        if (!(await checkAdmin(body.email, body.password))) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        const orders = (data ?? []).map((o) => ({
          id: o.id,
          date: o.created_at,
          status: o.status,
          customer: o.customer,
          items: o.items,
          subtotal: o.subtotal,
          shipping: o.shipping,
          total: o.total,
          tracking: o.tracking,
        }));
        return Response.json({ orders });
      },
    },
  },
});
