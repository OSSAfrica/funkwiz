import { createHash, timingSafeEqual } from "node:crypto";

export function setupCodeMatches(provided: string, expected: string) {
  return (
    expected.length >= 32 &&
    timingSafeEqual(
      createHash("sha256").update(provided).digest(),
      createHash("sha256").update(expected).digest(),
    )
  );
}
