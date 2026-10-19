import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkAdmin, checkOrigin, rateLimit } from "@/lib/shop-server.server";

const bodySchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(120),
  action: z.enum(["list", "approve", "reject"]),
  id: z.string().uuid().optional(),
}).strict();

export const Route = createFileRoute("/api/public/admin/reviews")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkOrigin(request)) return Response.json({ error: "bad_origin" }, { status: 403 });
        if (!rateLimit(request, 40)) return Response.json({ error: "rate_limited" }, { status: 429 });
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
          if (body.action === "list") {
            const { data, error } = await supabaseAdmin.from("review_submissions")
              .select("id, name, rating, review_text, size, product_id, created_at")
              .eq("status", "pending").order("created_at", { ascending: false }).limit(100);
            if (error) return Response.json({ error: "reviews_unavailable" }, { status: 503 });
            const reviews = (data ?? []).map((review: any) => ({
              id: review.id,
              name: review.name,
              rating: review.rating,
              text: review.review_text,
              size: review.size ?? "",
              product_id: review.product_id ?? "",
              created_at: review.created_at,
            }));
            return Response.json({ reviews });
          }
          if (!body.id) return Response.json({ error: "missing_id" }, { status: 400 });
          if (body.action === "approve") {
            const { data, error } = await supabaseAdmin.rpc("approve_review_submission", { p_review_id: body.id });
            if (error) return Response.json({ error: "review_moderation_failed" }, { status: 503 });
            if (!data) return Response.json({ error: "review_not_pending" }, { status: 404 });
            return Response.json({ review: data });
          }
          const { data, error } = await supabaseAdmin.from("review_submissions")
            .update({ status: "rejected", moderated_at: new Date().toISOString() })
            .eq("id", body.id).eq("status", "pending").select("id").maybeSingle();
          if (error) return Response.json({ error: "review_moderation_failed" }, { status: 503 });
          if (!data) return Response.json({ error: "review_not_pending" }, { status: 404 });
          return Response.json({ ok: true });
        } catch {
          return Response.json({ error: "review_moderation_failed" }, { status: 503 });
        }
      },
    },
  },
});
