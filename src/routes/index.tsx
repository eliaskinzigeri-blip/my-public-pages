import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_SHOP, activeProducts, fullName, eur } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WHITE SAYY | Marque Streetwear — T-shirts Oversize, Sweats & Ensembles" },
      {
        name: "description",
        content:
          "Découvrez WHITE SAYY, marque streetwear au design brut et noir profond. T-shirts oversize (29,99 €), sweats zippés, joggings ballon et ensembles. Livraison France.",
      },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "color-scheme", content: "dark" },
      { property: "og:site_name", content: "WHITE SAYY" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "WHITE SAYY | Marque Streetwear — T-shirts Oversize, Sweats & Ensembles" },
      {
        property: "og:description",
        content:
          "Découvrez WHITE SAYY, marque streetwear au design brut et noir profond. T-shirts oversize (29,99 €), sweats zippés, joggings ballon et ensembles. Livraison France.",
      },
      { property: "og:url", content: "https://whitesayy.lovable.app/" },
      { property: "og:image", content: "https://whitesayy.lovable.app/images/og-white-sayy.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "WHITE SAYY — Marque streetwear" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "WHITE SAYY | Marque Streetwear" },
      {
        name: "twitter:description",
        content:
          "Streetwear noir profond & design brut. T-shirts oversize (29,99 €), sweats zippés, joggings ballon et ensembles.",
      },
      { name: "twitter:image", content: "https://whitesayy.lovable.app/images/og-white-sayy.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://whitesayy.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: activeProducts(DEFAULT_SHOP).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: fullName(p),
            url: `https://whitesayy.lovable.app/#/produit/${p.id}`,
            image: `https://whitesayy.lovable.app/images/p/${p.images[0].replace(/^p_/, "")}-800.webp`,
          })),
        }),
      },
    ],
  }),
  component: Index,
});

/* Fond noir partout (y compris quand on tire la page vers le haut ou le bas sur téléphone) */
const DARK_PAGE = `
  html, body { margin: 0; background: #0a0a0a !important; color-scheme: dark; overscroll-behavior: none; }
  body { overflow: hidden; }
  .storefront-frame { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; border: 0; background: #0a0a0a; color-scheme: dark; z-index: 10; }
  .seo-crawler-content { position: absolute; left: -9999px; top: 0; width: 1px; height: 1px; overflow: hidden; }
`;

function Index() {
  const frame = useRef<HTMLIFrameElement>(null);
  const products = activeProducts(DEFAULT_SHOP);

  /* Charge les finitions de fluidité (public/site-polish.js) dans le cadre du site */
  useEffect(() => {
    const f = frame.current;
    if (!f) return;
    const inject = () => {
      try {
        const d = f.contentDocument;
        if (!d || !d.body || d.location.href === "about:blank" || d.getElementById("ws-polish"))
          return;
        const s = d.createElement("script");
        s.id = "ws-polish";
        s.src = "/site-polish.js?v=1";
        d.body.appendChild(s);
      } catch {
        /* cadre inaccessible : le site reste fonctionnel sans les finitions */
      }
    };
    inject();
    f.addEventListener("load", inject);
    return () => f.removeEventListener("load", inject);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DARK_PAGE }} />

      {/* Contenu sémantique pré-rendu pour les robots d'indexation, moteurs d'IA et lecteurs d'accessibilité */}
      <div className="seo-crawler-content" aria-hidden="true">
        <header>
          <h1>WHITE SAYY — Marque Streetwear Française</h1>
          <p>Une identité. Noir profond, graphisme brut. T-shirts oversize, sweats zippés, joggings coupe ballon et ensembles.</p>
          <nav aria-label="Navigation principale">
            <a href="/boutique">Boutique</a>
            <a href="/boutique/t-shirts">T-shirts</a>
            <a href="/boutique/sweats">Sweats</a>
            <a href="/boutique/joggings">Joggings</a>
            <a href="/boutique/ensembles">Ensembles</a>
            <a href="/a-propos">À propos</a>
            <a href="/contact">Contact</a>
            <a href="/avis">Avis clients</a>
            <a href="/mentions-legales">Mentions légales</a>
          </nav>
        </header>

        <main>
          <section>
            <h2>Collection Streetwear WHITE SAYY ({products.length} pièces)</h2>
            <ul>
              {products.map((p) => (
                <li key={p.id}>
                  <article>
                    <h3>{fullName(p)}</h3>
                    <p>{p.subtitle} — {p.tagline} — {eur(p.price)}</p>
                    <p>{p.description}</p>
                    <a href={`/produit/${p.id}`}>Voir le produit {fullName(p)}</a>
                  </article>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>L'esprit WHITE SAYY</h2>
            <p>
              WHITE SAYY est une marque streetwear née d'une vision minimaliste et percutante : porter une attitude sans compromis.
              Des pièces noires, un graphisme brut, des matières en coton peigné lourd (240 g/m² pour les t-shirts, 400 g/m² pour les sweats et joggings), rien de superflu.
            </p>
          </section>
        </main>

        <footer>
          <p>© {new Date().getFullYear()} WHITE SAYY Studio. Tous droits réservés.</p>
          <p>Contact : contact@whitesayy.com — Instagram : @l_.say</p>
          <p>Livraison rapide en France métropolitaine — Retours sous 14 jours.</p>
        </footer>
      </div>

      {/* Version différente pour forcer le rechargement du HTML embarqué sur les navigateurs concernés. */}
      <iframe
        ref={frame}
        className="storefront-frame"
        src="/white-sayy.html?v=20261020-adminpwd-fix"
        title="WHITE SAYY — Boutique en ligne"
      />
    </>
  );
}
