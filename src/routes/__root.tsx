import {
  HeadContent,
  Scripts,
  createRootRoute,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import { Button } from "@/components/ui/button";

import { ThemeToggle } from "@/components/theme-toggle";
import { themeBootScript } from "@/lib/theme";

import { socialHead } from "@/lib/social";
import { getPublicSiteOrigin } from "@/lib/social-origin";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  beforeLoad: async () => ({ siteOrigin: await getPublicSiteOrigin() }),
  head: ({ match }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      ...socialHead("app", match.context.siteOrigin).meta,
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  shellComponent: RootDocument,
  errorComponent: WorkspaceError,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" prefix="og: https://ogp.me/ns#" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <ThemeToggle />
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: "bottom-left" }}
            plugins={[
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}

function WorkspaceError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <main className="workspace-error">
      <div className="auth-form-card">
        <span className="eyebrow">A LITTLE HICCUP</span>
        <h1>Let’s give that another go.</h1>
        <p>
          We couldn’t open your workspace. Check your connection, then try
          again.
        </p>
        <Button
          onClick={() => {
            void router.invalidate().then(reset);
          }}
        >
          Try again
        </Button>
      </div>
    </main>
  );
}
