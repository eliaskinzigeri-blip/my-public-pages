/*
 * Résolution des images produit.
 * Les clés historiques (« p_hd_f », « hero »…) pointent désormais vers des
 * fichiers WebP hébergés sur le site (public/images/p/), déclinés en plusieurs
 * largeurs. Une URL complète ou une data URL saisie dans l'admin est utilisée telle quelle.
 */
import manifest from "./image-manifest.json";

type Entry = { w: number; h: number; widths: number[] };
const M = manifest as unknown as Record<string, Entry>;

const ALIASES: Record<string, string> = { "r360:1": "worn-dos", "r360:7": "worn-face" };

function keyOf(k: string): string | null {
  if (!k) return null;
  if (ALIASES[k]) return ALIASES[k];
  const bare = k.startsWith("p_") ? k.slice(2) : k;
  return M[bare]?.widths?.length ? bare : null;
}

export type ImageSource = { src: string; srcSet?: string; width: number; height: number };

export function resolveImage(k: string | undefined, preferred = 800): ImageSource {
  const key = keyOf(k || "");
  if (!key) {
    return { src: k || "", width: 800, height: 1000 };
  }
  const e = M[key]!;
  const best = e.widths.reduce((a, w) => (Math.abs(w - preferred) < Math.abs(a - preferred) ? w : a), e.widths[0]!);
  const ratio = e.h / e.w;
  return {
    src: `/images/p/${key}-${best}.webp`,
    srcSet: e.widths.map((w) => `/images/p/${key}-${w}.webp ${Math.min(w, e.w)}w`).join(", "),
    width: 800,
    height: Math.round(800 * ratio),
  };
}

export const imageUrl = (k: string | undefined, preferred = 800) => resolveImage(k, preferred).src;

export const LOGO = { src: "/images/logo.webp", png: "/images/logo.png", width: (M.logo?.w as number) || 102, height: (M.logo?.h as number) || 95 };
