import { test } from "node:test";
import assert from "node:assert/strict";
import { importExample, parseImport, parseQuiz } from "./quiz";

test("imports a complete quiz with independent question identities", () => {
  const first = parseImport(importExample);
  const second = parseImport(importExample);
  assert.equal(first.questions.length, 2);
  assert.equal(first.questions[0].correctIndex, 1);
  assert.equal(first.questions[1].duration, 15);
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.questions[0].id, second.questions[0].id);
});
test("rejects malformed and oversized JSON with usable messages", () => {
  assert.throws(() => parseImport("{"), /JSON could not be read/);
  assert.throws(() => parseImport(" ".repeat(500_001)), /500 KB/);
});
test("validates answer count, correct answer, and duration boundaries", () => {
  const data = JSON.parse(importExample);
  for (const correctIndex of [-1, 4, 0.5, "1"]) {
    assert.throws(
      () =>
        parseQuiz({
          ...data,
          questions: [{ ...data.questions[0], correctIndex }],
        }),
      /correctIndex/,
    );
  }
  for (const duration of [0, 4, 301, 5.5, "20"]) {
    assert.throws(
      () =>
        parseQuiz({ ...data, questions: [{ ...data.questions[0], duration }] }),
      /whole number/,
    );
  }
  assert.throws(
    () =>
      parseQuiz({
        ...data,
        questions: [{ ...data.questions[0], answers: ["one", "two"] }],
      }),
    /four answers/,
  );
  assert.throws(
    () =>
      parseQuiz({
        ...data,
        questions: [
          { ...data.questions[0], answers: ["one", "two", "three", "  "] },
        ],
      }),
    /four answers/,
  );
  assert.equal(
    parseQuiz({ ...data, questions: [{ ...data.questions[0], duration: 5 }] })
      .questions[0].duration,
    5,
  );
  assert.equal(
    parseQuiz({ ...data, questions: [{ ...data.questions[0], duration: 300 }] })
      .questions[0].duration,
    300,
  );
});
test("requires nonempty titles/questions and at most 100 questions", () => {
  const data = JSON.parse(importExample);
  assert.throws(() => parseQuiz({ ...data, title: " " }), /title/);
  assert.throws(() => parseQuiz({ ...data, questions: [] }), /1 and 100/);
  assert.throws(
    () => parseQuiz({ ...data, questions: Array(101).fill(data.questions[0]) }),
    /1 and 100/,
  );
  assert.throws(() => parseQuiz({ ...data, questions: [null] }), /Question 1/);
});
