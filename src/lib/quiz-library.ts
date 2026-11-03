import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type { Quiz } from "./quiz";

dayjs.extend(utc);

export const quizSortOptions = {
  newest: "Date created: newest first",
  oldest: "Date created: oldest first",
  name: "Name: A–Z",
  "name-desc": "Name: Z–A",
} as const;
export type QuizSort = keyof typeof quizSortOptions;

export function formatQuizCreatedAt(value: string, local = false) {
  const date = dayjs.utc(value);
  if (!date.isValid()) return null;
  return (local ? date.local() : date)
    .locale("en")
    .format(`D MMM YYYY [at] h:mm A${local ? "" : " [UTC]"}`);
}

function creationTime(quiz: Quiz) {
  if (!quiz.createdAt) return null;
  const timestamp = Date.parse(quiz.createdAt);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function sortQuizzes(quizzes: Quiz[], sort: QuizSort): Quiz[] {
  return [...quizzes].sort((a, b) => {
    const name = a.title.localeCompare(b.title, "en", {
      sensitivity: "base",
      numeric: true,
    });
    if (sort === "name" || sort === "name-desc")
      return (sort === "name" ? name : -name) || a.id.localeCompare(b.id, "en");
    const first = creationTime(a);
    const second = creationTime(b);
    // Unknown dates stay last in either direction; never substitute edit time.
    if (first === null && second !== null) return 1;
    if (first !== null && second === null) return -1;
    const difference = first !== null && second !== null ? first - second : 0;
    return (
      (sort === "newest" ? -difference : difference) ||
      name ||
      a.id.localeCompare(b.id, "en")
    );
  });
}
