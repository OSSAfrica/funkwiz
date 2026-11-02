# Social previews

[Documentation index](README.md) · [Project overview](../README.md)

Open Graph and large-image Twitter tags are included in the initial server HTML.
No crawler JavaScript, logged-in session, image-generation API or database query
is needed to serve the PNGs. Image URLs, canonical links and `og:url` are absolute.
The app uses the public origin from `BETTER_AUTH_URL`, which already configures
sign-in and recovery links; before auth setup it falls back to the request origin.
Client navigation reuses the origin in the existing canonical metadata, without
an extra metadata request or exposing server configuration.

| Page                                | Card            | Preview destination                          |
| ----------------------------------- | --------------- | -------------------------------------------- |
| Teacher library `/`                 | Default app     | `/`                                          |
| Student `/join`                     | Join invitation | `/join`, preserving a valid six-digit `code` |
| Student `/play/:code`               | Join invitation | `/join?code=…`                               |
| Teacher `/login`                    | Teacher         | `/login`                                     |
| Teacher `/host/:code`               | Teacher         | `/login`                                     |
| Reports `/reports/:id`              | Teacher         | `/login`                                     |
| Teacher invitation `/accept-invite` | Teacher         | `/login`, without the invitation proof       |
| Recovery `/forgot-password`         | Teacher         | `/forgot-password`                           |
| Password reset `/reset-password`    | Teacher         | `/forgot-password`, without the token        |

Authentication behavior is unchanged: anonymous library, host and report visits
follow the existing sign-in redirect and receive the generic teacher preview.
Editor and setup dialogs use their containing library page's default card.
Private teacher routes and recovery pages are marked noindex; the generic join
page is indexable, while specific room invitations are noindex. Images remain
publicly fetchable so social previews can render.

Preview copy never uses quiz titles, questions, learner names, scores or account
details. Room codes are deliberately shareable destinations but are not printed
in the artwork or preview text. Tracking parameters and authentication errors are
not included. Reset and invitation tokens are never passed into the metadata builder; recovery
no-store and no-referrer protections remain in place.

The root provides fallback metadata; each leaf owns its canonical link and
page-specific metadata. TanStack deduplicates inherited meta fields by their
name/property. `src/lib/social.ts` holds copy, image paths, alt text and URL policy;
`src/lib/social-origin.ts` chooses the public origin. See `public/og/README.md`
for the reusable artwork template and `bun run og:generate`.

Local checks validate the initial crawler HTML, image MIME type/dimensions,
canonical uniqueness, client navigation, appearance independence and private
report content. Actual WhatsApp, Facebook, LinkedIn and X previews require a
publicly reachable HTTPS deployment; localhost cannot be fetched by their bots.
After deploying, use the platform's share debugger/inspector to request a refresh
if it has cached an older preview. No deployment or external social post is part
of this change.

Protocol reference: [Open Graph](https://ogp.me/).
