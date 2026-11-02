import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { socialImages, type SocialImage } from "../src/lib/social";
import { socialCardHtml } from "./social-card";

const fonts = {
  fredoka: (
    await readFile(
      "node_modules/@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2",
    )
  ).toString("base64"),
  nunito: (
    await readFile(
      "node_modules/@fontsource-variable/nunito-sans/files/nunito-sans-latin-wght-normal.woff2",
    )
  ).toString("base64"),
};
await mkdir("public/og", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  for (const kind of Object.keys(socialImages) as SocialImage[]) {
    await page.setContent(socialCardHtml(kind, fonts));
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth > 1200 ||
        document.documentElement.scrollHeight > 630,
    );
    if (overflow)
      throw new Error(`The ${kind} social card exceeds its canvas.`);
    const path = `public${socialImages[kind].path}`;
    await page.screenshot({ path, type: "png", omitBackground: false });
    console.log(`Rendered ${kind}: ${path} (1200 × 630)`);
  }
} finally {
  await browser.close();
}
