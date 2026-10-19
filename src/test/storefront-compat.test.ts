import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const storefront = readFileSync(resolve(process.cwd(), "public/white-sayy.html"), "utf8");
const rootRoute = readFileSync(resolve(process.cwd(), "src/routes/index.tsx"), "utf8");
const inlineScripts = Array.from(storefront.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi));

describe("storefront browser compatibility", () => {
  it("keeps the inline storefront script within Safari 12 syntax", () => {
    expect(inlineScripts).toHaveLength(1);
    const script = inlineScripts[0][1];

    expect(script).not.toMatch(/\?\./);
    expect(script).not.toMatch(/\?\?/);
    expect(script).not.toMatch(/\|\|=|&&=/);
  });

  it("avoids unsupported initial-render APIs and provides fallbacks", () => {
    const script = inlineScripts[0][1];

    expect(script).toContain("replaceChildrenCompat");
    expect(script).not.toMatch(/\.replaceChildren\s*\(/);
    expect(script).not.toContain("Object.fromEntries");
    expect(script).toContain("document.documentElement.contains(section)");
  });

  it("provides legacy viewport and cache-busting fallbacks", () => {
    expect(storefront).toMatch(
      /height:\s*calc\(100vh\s*-\s*var\(--hd\)\);\s*height:\s*calc\(100svh/,
    );
    expect(rootRoute).toContain("height: 100vh; height: 100dvh");
    expect(rootRoute).toContain("20261019-legacy-browser-fix");
  });
});
