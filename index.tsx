import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WHITE SAYY" },
      { name: "description", content: "WHITE SAYY — marque streetwear. T-shirts, sweats, joggings et ensembles." },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "color-scheme", content: "dark" },
      { property: "og:title", content: "WHITE SAYY" },
      { property: "og:description", content: "WHITE SAYY — marque streetwear. T-shirts, sweats, joggings et ensembles." },
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
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DARK_PAGE }} />
      <iframe
        src="/white-sayy.html"
        title="WHITE SAYY"
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", border: 0, background: "#0a0a0a", colorScheme: "dark" }}
      />
    </>
  );
}
