import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkAdmin, checkOrigin, rateLimit } from "@/lib/shop-server.server";

const bodySchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(120),
  data: z.record(z.string(), z.unknown()),
}).strict();

export const Route = createFileRoute("/api/public/shop")({
  server: {
    handlers: {
      // Les produits et réglages publiés sont publics ; aucune donnée client n'est exposée ici.
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.from("shop_data").select("data, updated_at").eq("id", 1).maybeSingle();
          if (error) return Response.json({ error: "shop_unavailable" }, { status: 503 });
          return Response.json(data ?? { data: null });
        } catch {
          return Response.json({ error: "shop_unavailable" }, { status: 503 });
        }
      },
      POST: async ({ request }) => {
        if (!checkOrigin(request)) return Response.json({ error: "bad_origin" }, { status: 403 });
        if (!rateLimit(request, 60)) return Response.json({ error: "rate_limited" }, { status: 429 });
        const declaredSize = Number(request.headers.get("content-length") ?? 0);
        if (declaredSize > 20_000_000) return Response.json({ error: "payload_too_large" }, { status: 413 });
        let body: z.infer<typeof bodySchema>;
        try {
          const raw = await request.text();
          if (new TextEncoder().encode(raw).byteLength > 20_000_000) return Response.json({ error: "payload_too_large" }, { status: 413 });
          body = bodySchema.parse(JSON.parse(raw));
        } catch {
          return Response.json({ error: "invalid_body" }, { status: 400 });
        }
        if (!(await checkAdmin(body.email, body.password))) return Response.json({ error: "unauthorized" }, { status: 401 });
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("shop_data").upsert({ id: 1, data: body.data as never, updated_at: new Date().toISOString() });
          if (error) return Response.json({ error: "shop_save_failed" }, { status: 503 });
          return Response.json({ ok: true });
        } catch {
          return Response.json({ error: "shop_save_failed" }, { status: 503 });
        }
      },
    },
  },
});
