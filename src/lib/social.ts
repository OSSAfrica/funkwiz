export const socialImages = {
  app: {
    path: "/og/funkwiz-v1.png",
    alt: "Funkwiz: A little curiosity. A lot of fun. Colorful quiz cards on a forest green background.",
  },
  join: {
    path: "/og/join-v2.png",
    alt: "Funkwiz: Your next aha is waiting. A playful phone with four colorful answer shapes.",
  },
  teacher: {
    path: "/og/teacher-v2.png",
    alt: "Funkwiz: Great questions start with you. Playful space, nature and world quiz illustrations.",
  },
} as const;
export type SocialImage = keyof typeof socialImages;
export type SocialPage =
  | "app"
  | "join"
  | "teacher"
  | "recovery"
  | "reset"
  | "host"
  | "play"
  | "report";
const pages: Record<
  SocialPage,
  {
    title: string;
    description: string;
    image: SocialImage;
    path: string;
    robots: string;
  }
> = {
  app: {
    title: "Funkwiz — A little curiosity. A lot of fun.",
    description:
      "Create colorful classroom quizzes, set your pace, and turn learning into play.",
    image: "app",
    path: "/",
    robots: "noindex, follow",
  },
  join: {
    title: "Join a classroom game | Funkwiz",
    description:
      "Your next aha is waiting. Enter your game code, choose a nickname, and join the fun. No account needed.",
    image: "join",
    path: "/join",
    robots: "index, follow",
  },
  teacher: {
    title: "Teacher sign-in | Funkwiz",
    description:
      "Great questions start with you. Create colorful quizzes, find your classroom rhythm, and make learning play.",
    image: "teacher",
    path: "/login",
    robots: "noindex, follow",
  },
  recovery: {
    title: "Recover your teacher account | Funkwiz",
    description:
      "A fresh start for your teacher workspace. Recover your account and get back to the good questions.",
    image: "teacher",
    path: "/forgot-password",
    robots: "noindex, nofollow, noarchive",
  },
  reset: {
    title: "Reset your password | Funkwiz",
    description:
      "Choose a fresh password and get back to your Funkwiz classroom.",
    image: "teacher",
    path: "/forgot-password",
    robots: "noindex, nofollow, noarchive",
  },
  host: {
    title: "Your live classroom | Funkwiz",
    description:
      "Good questions. Great company. A live classroom quiz, at your teacher’s pace.",
    image: "teacher",
    path: "/login",
    robots: "noindex, nofollow",
  },
  play: {
    title: "Join the classroom fun | Funkwiz",
    description:
      "A little friendly competition. A lot of aha moments. Join your teacher’s live classroom game.",
    image: "join",
    path: "/join",
    robots: "noindex, follow",
  },
  report: {
    title: "Classroom insights | Funkwiz",
    description:
      "Turn answers into insights. Funkwiz classroom reports are available in the private teacher workspace.",
    image: "teacher",
    path: "/login",
    robots: "noindex, nofollow",
  },
};

/** Only an origin is public. Auth configuration, path, query and credentials stay out. */
export function publicSiteOrigin(
  configured: string | undefined,
  requested: string,
) {
  for (const value of [configured, requested]) {
    try {
      const url = new URL(value ?? "");
      if (url.protocol === "https:" || url.protocol === "http:")
        return url.origin;
    } catch {
      /* Try the actual request origin when configuration is absent. */
    }
  }
  throw new Error("A public HTTP origin is required for social previews.");
}

export function socialHead(
  page: SocialPage,
  origin: string,
  options: { code?: unknown } = {},
) {
  const config = pages[page],
    image = socialImages[config.image];
  const canonical = new URL(config.path, origin);
  const hasCode =
    (page === "join" || page === "play") &&
    typeof options.code === "string" &&
    /^\d{6}$/.test(options.code);
  // A room code is deliberately shareable: retain the deep link, never put it in the artwork.
  if (hasCode) canonical.searchParams.set("code", String(options.code));
  const imageUrl = new URL(image.path, origin).href;
  return {
    meta: [
      { title: config.title },
      { name: "description", content: config.description },
      { name: "robots", content: hasCode ? "noindex, follow" : config.robots },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Funkwiz" },
      { property: "og:locale", content: "en_GB" },
      { property: "og:title", content: config.title },
      { property: "og:description", content: config.description },
      { property: "og:url", content: canonical.href },
      { property: "og:image", content: imageUrl },
      ...(imageUrl.startsWith("https:")
        ? [{ property: "og:image:secure_url", content: imageUrl }]
        : []),
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: image.alt },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: config.title },
      { name: "twitter:description", content: config.description },
      { name: "twitter:image", content: imageUrl },
      { name: "twitter:image:alt", content: image.alt },
    ],
    links: [{ rel: "canonical", href: canonical.href }],
  };
}
