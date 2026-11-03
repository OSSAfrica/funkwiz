import { test } from "node:test";
import assert from "node:assert/strict";
import { formatQuizCreatedAt, sortQuizzes } from "./quiz-library";
import { parseImport, parseQuiz } from "./quiz";
import { sampleQuizzes } from "./sample-quizzes.server";

const older = {
  ...sampleQuizzes[0],
  id: "older",
  title: "Zebra",
  createdAt: "2026-11-01T09:30:00Z",
  updatedAt: "2026-11-03T09:30:00Z",
};
const newer = {
  ...older,
  id: "newer",
  title: "Apple",
  createdAt: "2026-11-02T09:30:00Z",
  updatedAt: "2026-11-02T09:30:00Z",
};

test("creation sorting ignores edit dates and leaves unknown dates last", () => {
  const quizzes = [older, sampleQuizzes[0], newer];
  assert.deepEqual(
    sortQuizzes(quizzes, "newest").map((q) => q.id),
    ["newer", "older", sampleQuizzes[0].id],
  );
  assert.deepEqual(
    sortQuizzes(quizzes, "oldest").map((q) => q.id),
    ["older", "newer", sampleQuizzes[0].id],
  );
  assert.equal(quizzes[0], older);
  const invalid = { ...older, id: "invalid", createdAt: "invalid" };
  assert.equal(sortQuizzes([invalid, newer], "oldest")[1], invalid);
});

test("name sorting handles both directions and has stable tie breakers", () => {
  assert.deepEqual(
    sortQuizzes([older, newer], "name").map((q) => q.title),
    ["Apple", "Zebra"],
  );
  assert.deepEqual(
    sortQuizzes([older, newer], "name-desc").map((q) => q.title),
    ["Zebra", "Apple"],
  );
  const tie = { ...newer, id: "aaa" };
  assert.deepEqual(
    sortQuizzes([newer, tie], "newest").map((q) => q.id),
    ["aaa", "newer"],
  );
});

test("Day.js renders a readable, deterministic UTC fallback", () => {
  assert.equal(
    formatQuizCreatedAt(older.createdAt),
    "1 Nov 2026 at 9:30 AM UTC",
  );
  assert.equal(formatQuizCreatedAt("invalid"), null);
  assert.equal(
    formatQuizCreatedAt("2026-11-01T11:30:00+02:00"),
    formatQuizCreatedAt(older.createdAt),
  );
});

test("legacy drafts retain missing dates; imported copies receive a new creation date on save", () => {
  assert.equal(parseQuiz(sampleQuizzes[0]).createdAt, undefined);
  assert.equal(parseQuiz(older).createdAt, "2026-11-01T09:30:00.000Z");
  assert.equal(
    parseQuiz({ ...older, createdAt: "invalid" }).createdAt,
    undefined,
  );
  assert.equal(parseImport(JSON.stringify(older)).createdAt, undefined);
});
