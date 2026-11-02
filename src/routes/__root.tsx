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

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Fun Quiz — A little curiosity. A lot of fun." },
      {
        name: "description",
        content:
          "Create colorful classroom quizzes, set your pace, and turn learning into play.",
      },
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
    <html lang="en" suppressHydrationWarning>
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
