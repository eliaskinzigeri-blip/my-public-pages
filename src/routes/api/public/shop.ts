import { createFileRoute } from "@tanstack/react-router";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/shop")({
  server: {
    handlers: {
      // Public read: the shop data is non-sensitive (products, settings).
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("shop_data")
          .select("data, updated_at")
          .eq("id", 1)
          .maybeSingle();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json(data ?? { data: null });
      },
      // Admin write: verified against server-side secrets, never exposed to the browser.
      POST: async ({ request }) => {
        let body: { email?: string; password?: string; data?: unknown };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_body" }, { status: 400 });
        }
        const email = (body.email ?? "").trim().toLowerCase();
        const expectedEmail = (process.env["ADMIN_EMAIL"] ?? "").trim().toLowerCase();
        const expectedHash = process.env["ADMIN_PASSWORD_HASH"] ?? "";
        const givenHash = await sha256Hex(`${email}|${body.password ?? ""}`);
        if (!expectedEmail || !expectedHash || email !== expectedEmail || givenHash !== expectedHash) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        if (!body.data || typeof body.data !== "object") {
          return Response.json({ error: "missing_data" }, { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("shop_data")
          .upsert({ id: 1, data: body.data, updated_at: new Date().toISOString() });
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
