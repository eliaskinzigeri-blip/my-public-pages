import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WHITE SAYY" },
      { name: "description", content: "WHITE SAYY — marque streetwear. T-shirts oversize noirs, graphisme brut." },
      { property: "og:title", content: "WHITE SAYY" },
      { property: "og:description", content: "WHITE SAYY — marque streetwear. T-shirts oversize noirs, graphisme brut." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/white-sayy.html"
      title="WHITE SAYY"
      className="fixed inset-0 h-screen w-screen border-0"
    />
  );
}
