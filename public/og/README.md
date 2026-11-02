# Social preview artwork

Three versioned, opaque PNGs at 1200 × 630:

- `funkwiz-v1.png`: default app branding and a playful question card.
- `join-v2.png`: a student invitation with a phone and answer shapes.
- `teacher-v2.png`: generic teacher branding with space, nature and world cards.

The palette and typography are fixed to forest green, cream, gold, Fredoka and
Nunito. App appearance settings do not affect these assets. The artwork contains
no room codes, reset links, private quiz content, teacher details or learner data.

Regenerate with `bun run og:generate`. It uses the reusable template in
`scripts/social-card.ts`, the project's local fonts, and Playwright Chromium.
If needed, install its browser first with `bunx playwright install chromium`.
The generator makes no network requests and needs no Worker or database running.

When changing artwork, bump the image filenames in `src/lib/social.ts` before
regenerating so social platforms can discover the new image URL. Keep the image
alt text in that file aligned with the design.
