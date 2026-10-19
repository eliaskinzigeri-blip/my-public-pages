import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WHITE SAYY" },
      {
        name: "description",
        content: "WHITE SAYY — marque streetwear. T-shirts, sweats, joggings et ensembles.",
      },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "color-scheme", content: "dark" },
      { property: "og:title", content: "WHITE SAYY" },
      {
        property: "og:description",
        content: "WHITE SAYY — marque streetwear. T-shirts, sweats, joggings et ensembles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

/* Fond noir partout (y compris quand on tire la page vers le haut ou le bas sur téléphone) */
const DARK_PAGE = `
  html, body { margin: 0; background: #0a0a0a !important; color-scheme: dark; overscroll-behavior: none; }
  body { overflow: hidden; }
`;

function Index() {
  const frame = useRef<HTMLIFrameElement>(null);

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
      <iframe
        ref={frame}
        src="/white-sayy.html"
        title="WHITE SAYY"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100dvh",
          border: 0,
          background: "#0a0a0a",
          colorScheme: "dark",
        }}
      />
    </>
  );
}
