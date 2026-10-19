import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkAdmin,
  checkOrigin,
  sha256Hex,
  verifyStripeSignature,
} from "@/lib/shop-server.server";

afterEach(() => {
  vi.unstubAllEnvs();
});

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

describe("shop server security helpers", () => {
  it("accepts only same-origin mutations", () => {
    expect(
      checkOrigin(
        new Request("https://shop.example/api", { headers: { origin: "https://shop.example" } }),
      ),
    ).toBe(true);
    expect(
      checkOrigin(
        new Request("https://shop.example/api", {
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toBe(false);
  });

  it("checks the admin email and configured SHA-256 password hash", async () => {
    const email = "admin@white-sayy.fr";
    const password = "correct-horse-battery";
    vi.stubEnv("ADMIN_EMAIL", email);
    vi.stubEnv("ADMIN_PASSWORD_HASH", await sha256Hex(`${email}|${password}`));

    await expect(checkAdmin(email, password)).resolves.toBe(true);
    await expect(checkAdmin(email, "incorrect-password")).resolves.toBe(false);
    await expect(checkAdmin("someone-else@example.com", password)).resolves.toBe(false);
  });

  it("verifies a fresh Stripe webhook HMAC and rejects stale timestamps", async () => {
    const payload = JSON.stringify({ id: "evt_test" });
    const secret = "whsec_unit_test_secret";
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await hmacHex(secret, `${timestamp}.${payload}`);

    await expect(
      verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, secret),
    ).resolves.toBe(true);
    await expect(
      verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, "wrong-secret"),
    ).resolves.toBe(false);
    await expect(
      verifyStripeSignature(payload, `t=${timestamp - 600},v1=${signature}`, secret),
    ).resolves.toBe(false);
  });
});
