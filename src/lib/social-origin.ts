import { createIsomorphicFn } from "@tanstack/react-start";
import { publicSiteOrigin } from "./social";

export const getPublicSiteOrigin = createIsomorphicFn()
  .server(async () => {
    const [{ env }, { getRequestUrl }] = await Promise.all([
      import("cloudflare:workers"),
      import("@tanstack/react-start/server"),
    ]);
    return publicSiteOrigin(env.BETTER_AUTH_URL, getRequestUrl().origin);
  })
  .client(() => {
    // Reuse the origin already rendered by the server, without another request.
    const canonical =
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ??
      document.querySelector<HTMLMetaElement>('meta[property="og:url"]')
        ?.content;
    return publicSiteOrigin(canonical, window.location.origin);
  });
