import { parseQuiz } from "./quiz";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function prepareQuizForStorage(value: unknown) {
  if (JSON.stringify(value)?.length > 500_000)
    throw new Error("Keep your quiz under 500 KB.");
  const quiz = parseQuiz(value);
  const seen = new Set<string>();
  return {
    ...quiz,
    id: uuidPattern.test(quiz.id) ? quiz.id : crypto.randomUUID(),
    isExample: false,
    questions: quiz.questions.map((q) => {
      const id =
        uuidPattern.test(q.id) && !seen.has(q.id) ? q.id : crypto.randomUUID();
      seen.add(id);
      return { ...q, id };
    }),
  };
}
