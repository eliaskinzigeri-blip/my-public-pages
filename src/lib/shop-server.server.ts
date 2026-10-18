// Helpers serveur pour la boutique WHITE SAYY (Stripe + commandes).
// Fichier .server.ts : jamais inclus dans le bundle client.

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(key: string | CryptoKey, data: string): Promise<string> {
  const k =
    typeof key === "string"
      ? await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
      : key;
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Vérifie la signature Stripe (scheme v1, tolérance 5 min).
export async function verifyStripeSignature(payload: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    }),
  );
  const t = parts["t"];
  const v1s = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !v1s.length) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(t)) > 300) return false;
  const expected = await hmacSha256Hex(secret, `${t}.${payload}`);
  return v1s.some((v1) => v1.length === expected.length && timingSafeEq(v1, expected));
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Appel REST Stripe (évite la dépendance npm, compatible Workers).
export async function stripeApi(path: string, method: "GET" | "POST", params?: Record<string, string>): Promise<any> {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("stripe_not_configured");
  const url = "https://api.stripe.com" + path;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" && params ? new URLSearchParams(params).toString() : null,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `stripe_${res.status}`);
  return json;
}

// Authentification admin identique à POST /api/public/shop.
export async function checkAdmin(email: string | undefined, password: string | undefined): Promise<boolean> {
  const e = (email ?? "").trim().toLowerCase();
  const expectedEmail = (process.env["ADMIN_EMAIL"] ?? "").trim().toLowerCase();
  const expectedHash = process.env["ADMIN_PASSWORD_HASH"] ?? "";
  if (!expectedEmail || !expectedHash || e !== expectedEmail) return false;
  const given = await sha256Hex(`${e}|${password ?? ""}`);
  return timingSafeEq(given, expectedHash);
}

// Vérifie que la requête vient bien du site (même origine).
export function checkOrigin(request: Request): boolean {
  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (!origin) return true; // navigateurs en navigation directe
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

// Limiteur ad-hoc en mémoire (best-effort : chaque instance a son propre compteur).
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(request: Request, limit = 20, windowMs = 60_000): boolean {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.reset < now) {
    buckets.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

export async function getShopData(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("shop_data").select("data").eq("id", 1).maybeSingle();
  return data?.data ?? null;
}
