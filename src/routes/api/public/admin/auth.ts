import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkAdmin, checkOrigin, rateLimit } from "@/lib/shop-server.server";

const bodySchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(120),
}).strict();

export const Route = createFileRoute("/api/public/admin/auth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkOrigin(request)) return Response.json({ error: "bad_origin" }, { status: 403 });
        if (!rateLimit(request, 8, 5 * 60_000)) return Response.json({ error: "rate_limited" }, { status: 429 });
        if (!process.env["ADMIN_EMAIL"] || !process.env["ADMIN_PASSWORD_HASH"]) {
          return Response.json({ error: "admin_not_configured" }, { status: 503 });
        }
        let body: z.infer<typeof bodySchema>;
        try {
          const raw = await request.text();
          if (new TextEncoder().encode(raw).byteLength > 16_000) return Response.json({ error: "payload_too_large" }, { status: 413 });
          body = bodySchema.parse(JSON.parse(raw));
        } catch {
          return Response.json({ error: "invalid_body" }, { status: 400 });
        }
        if (!(await checkAdmin(body.email, body.password))) return Response.json({ error: "unauthorized" }, { status: 401 });
        return Response.json({ ok: true });
      },
    },
  },
});
