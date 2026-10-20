import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const storefront = readFileSync(resolve(process.cwd(), "public/white-sayy.html"), "utf8");
const rootRoute = readFileSync(resolve(process.cwd(), "src/routes/index.tsx"), "utf8");
const inlineScripts = Array.from(storefront.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi));
const script = inlineScripts[0]?.[1];
if (script === undefined) throw new Error("Missing storefront script");

describe("storefront browser compatibility", () => {
  it("keeps the inline storefront script within Safari 12 syntax", () => {
    expect(inlineScripts).toHaveLength(1);

    expect(script).not.toMatch(/\?\./);
    expect(script).not.toMatch(/\?\?/);
    expect(script).not.toMatch(/\|\|=|&&=/);
  });

  it("avoids unsupported initial-render APIs and provides fallbacks", () => {

    expect(script).toContain("replaceChildrenCompat");
    expect(script).not.toMatch(/\.replaceChildren\s*\(/);
    expect(script).not.toContain("Object.fromEntries");
    expect(script).toContain("document.documentElement.contains(section)");
  });

  it("initializes adminPwd before the first currentUser call", () => {
    const adminPwdDeclaration = script.indexOf("let adminPwd = null;");
    const firstCurrentUserCall = script.indexOf("currentUser() || {}");

    expect(adminPwdDeclaration).toBeGreaterThanOrEqual(0);
    expect(firstCurrentUserCall).toBeGreaterThan(adminPwdDeclaration);
  });

  it("starts safely with an admin session left in browser storage", () => {
    const start = script.indexOf("let adminPwd = null;");
    const end = script.indexOf("if (!shop.settings.instagram)", start);
    const currentUser = script.match(/function currentUser\(\)[\s\S]*?(?=let authMode)/)?.[0];
    if (!currentUser || start < 0 || end < 0) throw new Error("Missing startup code");
    const context = {
      K: { session: "session", draft: "draft", users: "users" },
      read: (key: string, fallback: unknown) =>
        key === "session" ? { email: "previous-admin", admin: true } : fallback,
      DEFAULTS: { version: 1 },
      PUBLISHED: null,
      merge: (base: unknown) => base,
      localStorage: { removeItem: () => {} },
    };
    expect(runInNewContext(
      currentUser + script.slice(start, end) + "\ncurrentUser();",
      context,
    )).toBeNull();
  });

  it("provides legacy viewport and cache-busting fallbacks", () => {
    expect(storefront).toMatch(
      /height:\s*calc\(100vh\s*-\s*var\(--hd\)\);\s*height:\s*calc\(100svh/,
    );
    expect(rootRoute).toContain("height: 100vh; height: 100dvh");
    expect(rootRoute).toContain("20261020-adminpwd-fix");
  });
});
