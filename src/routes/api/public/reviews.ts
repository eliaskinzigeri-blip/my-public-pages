import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkOrigin, getShopData, rateLimit } from "@/lib/shop-server.server";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(32),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(3).max(500),
  size: z.string().trim().max(12).optional().default(""),
  productId: z.string().trim().max(80).optional().default(""),
  website: z.string().max(200).optional().default(""),
}).strict();

export const Route = createFileRoute("/api/public/reviews")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkOrigin(request)) return Response.json({ error: "bad_origin" }, { status: 403 });
        if (!rateLimit(request, 5, 60 * 60_000)) return Response.json({ error: "rate_limited" }, { status: 429 });
        const declaredSize = Number(request.headers.get("content-length") ?? 0);
        if (declaredSize > 8_000) return Response.json({ error: "payload_too_large" }, { status: 413 });
        let body: z.infer<typeof bodySchema>;
        try {
          const raw = await request.text();
          if (new TextEncoder().encode(raw).byteLength > 8_000) return Response.json({ error: "payload_too_large" }, { status: 413 });
          body = bodySchema.parse(JSON.parse(raw));
        } catch {
          return Response.json({ error: "invalid_body" }, { status: 400 });
        }
        // Honeypot discret : on répond normalement aux bots sans enregistrer leur contenu.
        if (body.website.trim()) return Response.json({ ok: true }, { status: 201 });
        try {
          if (body.productId) {
            const shop = await getShopData();
            if (!shop?.products?.some((product: any) => product.id === body.productId)) {
              return Response.json({ error: "unknown_product" }, { status: 400 });
            }
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("review_submissions").insert({
            id: crypto.randomUUID(),
            name: body.name,
            rating: body.rating,
            review_text: body.text,
            size: body.size || null,
            product_id: body.productId || null,
            status: "pending",
          });
          if (error) return Response.json({ error: "reviews_unavailable" }, { status: 503 });
          return Response.json({ ok: true }, { status: 201 });
        } catch {
          return Response.json({ error: "reviews_unavailable" }, { status: 503 });
        }
      },
    },
  },
});
