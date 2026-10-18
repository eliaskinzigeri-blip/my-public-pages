import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkAdmin, checkOrigin, rateLimit } from "@/lib/shop-server.server";

const STATUSES = ["En attente de paiement", "Payée", "Expédiée", "Livrée", "Expirée", "Annulée"] as const;
const bodySchema = z.object({
  email: z.string().max(120),
  password: z.string().max(120),
  id: z.string().min(4).max(60),
  status: z.enum(STATUSES),
  tracking: z.string().max(120).optional().default(""),
});

export const Route = createFileRoute("/api/public/admin/orders-update")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkOrigin(request)) return Response.json({ error: "bad_origin" }, { status: 403 });
        if (!rateLimit(request, 20)) return Response.json({ error: "rate_limited" }, { status: 429 });
        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid_body" }, { status: 400 });
        }
        if (!(await checkAdmin(body.email, body.password))) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("orders")
          .update({ status: body.status, tracking: body.tracking || null })
          .eq("id", body.id);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
