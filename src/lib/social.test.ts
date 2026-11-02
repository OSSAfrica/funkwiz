import { test } from "node:test";
import assert from "node:assert/strict";
import { publicSiteOrigin, socialHead } from "./social";

const origin = "https://quiz.example.test";
function meta(head: ReturnType<typeof socialHead>, key: string) {
  return head.meta.flatMap((tag) =>
    "content" in tag &&
    (("name" in tag && tag.name === key) ||
      ("property" in tag && tag.property === key))
      ? [tag.content]
      : [],
  )[0];
}
test("social origins prefer the configured app and discard paths, credentials and query strings", () => {
  assert.equal(
    publicSiteOrigin(
      "https://owner:private@quiz.example.test/api/auth?token=private",
      "https://other.example.test",
    ),
    origin,
  );
  assert.equal(
    publicSiteOrigin(undefined, "http://localhost:3000/join?code=123456"),
    "http://localhost:3000",
  );
  assert.equal(
    publicSiteOrigin("javascript:invalid", `${origin}/join`),
    origin,
  );
  assert.throws(() => publicSiteOrigin("file:///private", "invalid"));
});
test("social cards include absolute Open Graph and large-image Twitter metadata", () => {
  const head = socialHead("join", origin);
  assert.equal(meta(head, "og:type"), "website");
  assert.equal(meta(head, "og:image"), `${origin}/og/join-v1.png`);
  assert.equal(meta(head, "og:image:secure_url"), `${origin}/og/join-v1.png`);
  assert.equal(meta(head, "og:image:width"), "1200");
  assert.equal(meta(head, "og:image:height"), "630");
  assert.ok(meta(head, "og:image:alt"));
  assert.equal(meta(head, "twitter:card"), "summary_large_image");
  assert.equal(meta(head, "twitter:image"), meta(head, "og:image"));
  assert.equal(meta(head, "twitter:image:alt"), meta(head, "og:image:alt"));
});
test("shareable room codes preserve leading zeros in the destination but never enter artwork or copy", () => {
  for (const page of ["join", "play"] as const) {
    const head = socialHead(page, origin, { code: "012345" });
    assert.equal(meta(head, "og:url"), `${origin}/join?code=012345`);
    assert.equal(head.links[0].href, `${origin}/join?code=012345`);
    for (const key of [
      "og:title",
      "og:description",
      "og:image",
      "og:image:alt",
      "twitter:title",
      "twitter:description",
      "twitter:image",
    ])
      assert.ok(!meta(head, key)?.includes("012345"));
    assert.equal(meta(head, "robots"), "noindex, follow");
  }
});
test("invalid codes and all recovery query data are excluded from preview URLs", () => {
  for (const code of [
    "123",
    "1234567",
    "<script>",
    "123456&token=private",
    123456,
    undefined,
  ])
    assert.equal(
      meta(socialHead("join", origin, { code }), "og:url"),
      `${origin}/join`,
    );
  const reset = socialHead("reset", origin, { code: "012345" });
  assert.equal(meta(reset, "og:url"), `${origin}/forgot-password`);
  assert.equal(meta(reset, "robots"), "noindex, nofollow, noarchive");
  assert.ok(!JSON.stringify(reset).includes("012345"));
});
test("teacher and report previews use generic images and destinations", () => {
  for (const page of ["teacher", "host", "report"] as const) {
    const head = socialHead(page, origin);
    assert.equal(meta(head, "og:image"), `${origin}/og/teacher-v1.png`);
    assert.equal(meta(head, "og:url"), `${origin}/login`);
    assert.ok(meta(head, "robots")?.includes("noindex"));
  }
  const local = socialHead("app", "http://127.0.0.1:3000");
  assert.equal(meta(local, "og:image:secure_url"), undefined);
});
