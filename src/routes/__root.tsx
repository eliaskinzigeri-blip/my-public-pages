import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "WHITE SAYY | Marque Streetwear — T-shirts Oversize, Sweats & Ensembles" },
      {
        name: "description",
        content:
          "Découvrez WHITE SAYY, marque streetwear au design brut et noir profond. T-shirts oversize (29,99 €), sweats zippés, joggings ballon et ensembles. Livraison France.",
      },
      { name: "author", content: "WHITE SAYY" },
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
    links: [
      { rel: "canonical", href: "https://whitesayy.lovable.app/" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://whitesayy.lovable.app/#organization",
              name: "WHITE SAYY",
              url: "https://whitesayy.lovable.app/",
              logo: "https://whitesayy.lovable.app/images/logo.png",
              sameAs: ["https://www.instagram.com/l_.say/"],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                email: "contact@whitesayy.com",
                availableLanguage: ["fr"],
              },
            },
            {
              "@type": "WebSite",
              "@id": "https://whitesayy.lovable.app/#website",
              name: "WHITE SAYY",
              url: "https://whitesayy.lovable.app/",
              inLanguage: "fr-FR",
              publisher: { "@id": "https://whitesayy.lovable.app/#organization" },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
