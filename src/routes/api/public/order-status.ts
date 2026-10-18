import { createFileRoute } from "@tanstack/react-router";
import { rateLimit } from "@/lib/shop-server.server";

export const Route = createFileRoute("/api/public/order-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!rateLimit(request, 30)) return Response.json({ error: "rate_limited" }, { status: 429 });
        const id = new URL(request.url).searchParams.get("id") ?? "";
        if (!id || id.length > 60) return Response.json({ error: "missing_id" }, { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("orders").select("status, tracking").eq("id", id).maybeSingle();
        if (!data) return Response.json({ error: "not_found" }, { status: 404 });
        // Aucune donnée personnelle : statut et suivi uniquement.
        return Response.json({ status: data.status, tracking: data.tracking });
      },
    },
  },
});
