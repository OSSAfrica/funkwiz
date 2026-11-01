import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareQuizForStorage } from "./quiz-storage";
import { sampleQuizzes } from "./sample-quizzes.server";

test("server storage normalizes identities and strips the example flag", () => {
  const quiz = prepareQuizForStorage(sampleQuizzes[0]);
  assert.notEqual(quiz.id, sampleQuizzes[0].id);
  assert.equal(quiz.isExample, false);
  assert.equal(
    new Set(quiz.questions.map((q) => q.id)).size,
    quiz.questions.length,
  );
  assert.equal(prepareQuizForStorage(quiz).id, quiz.id);
});
test("duplicate question identities cannot produce conflicting editor keys", () => {
  const valid = prepareQuizForStorage(sampleQuizzes[0]);
  valid.questions[1].id = valid.questions[0].id;
  const clean = prepareQuizForStorage(valid);
  assert.notEqual(clean.questions[1].id, clean.questions[0].id);
});
test("server validation rejects invalid answers and oversized payloads", () => {
  assert.throws(
    () => prepareQuizForStorage({ ...sampleQuizzes[0], questions: [] }),
    /questions/,
  );
  assert.throws(
    () =>
      prepareQuizForStorage({
        ...sampleQuizzes[0],
        description: "x".repeat(500_001),
      }),
    /500 KB/,
  );
});
