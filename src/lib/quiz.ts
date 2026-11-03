import { quizId } from "./uuid";

export const covers = ["space", "nature", "world", "confetti"] as const;
export type Cover = (typeof covers)[number];
export type Question = {
  id: string;
  prompt: string;
  answers: string[];
  correctIndex: number;
  duration: number;
};
export type Quiz = {
  id: string;
  title: string;
  description: string;
  cover: Cover;
  questions: Question[];
  updatedAt: string;
  isExample?: boolean;
  visibility?: "private" | "workspace";
  canEdit?: boolean;
};
export type DisplayMode = "shared" | "devices" | "both";
export type GameSettings = {
  progression: "manual" | "automatic";
  cooldown: number;
  display: DisplayMode;
};
export const defaultSettings: GameSettings = {
  progression: "manual",
  cooldown: 5,
  display: "both",
};
export const displayLabels: Record<DisplayMode, string> = {
  shared: "Shared screen",
  devices: "Student devices",
  both: "Both screens",
};
export const durationLabel = (seconds: number) =>
  seconds >= 60
    ? `${Math.floor(seconds / 60)}m${seconds % 60 ? ` ${seconds % 60}s` : ""}`
    : `${seconds}s`;
export const quizMinutes = (quiz: Quiz) =>
  Math.max(
    1,
    Math.ceil(quiz.questions.reduce((sum, q) => sum + q.duration, 0) / 60),
  );
export const newQuestion = (): Question => ({
  id: quizId(),
  prompt: "",
  answers: ["", "", "", ""],
  correctIndex: 0,
  duration: 20,
});
export const newQuiz = (): Quiz => ({
  id: quizId(),
  title: "",
  description: "",
  cover: "confetti",
  questions: [newQuestion()],
  updatedAt: new Date().toISOString(),
});

// JSON imports and saved drafts share the same boundary validation.
export function parseQuiz(value: unknown): Quiz {
  if (!value || typeof value !== "object")
    throw new Error("Provide a quiz object with a title and questions.");
  const data = value as Record<string, unknown>;
  if (
    typeof data.title !== "string" ||
    !data.title.trim() ||
    data.title.length > 120
  ) {
    throw new Error("Give your quiz a title between 1 and 120 characters.");
  }
  if (
    !Array.isArray(data.questions) ||
    data.questions.length < 1 ||
    data.questions.length > 100
  ) {
    throw new Error("A quiz needs between 1 and 100 questions.");
  }
  const questions: Question[] = data.questions.map(
    (item: unknown, index: number) => {
      const q = item as Record<string, unknown> | null;
      const label = `Question ${index + 1}`;
      if (
        !q ||
        typeof q.prompt !== "string" ||
        !q.prompt.trim() ||
        q.prompt.length > 1000
      ) {
        throw new Error(
          `${label}: enter a question between 1 and 1,000 characters.`,
        );
      }
      if (
        !Array.isArray(q.answers) ||
        q.answers.length !== 4 ||
        q.answers.some(
          (a) => typeof a !== "string" || !a.trim() || a.length > 240,
        )
      ) {
        throw new Error(
          `${label}: provide four answers, each between 1 and 240 characters.`,
        );
      }
      if (
        !Number.isInteger(q.correctIndex) ||
        Number(q.correctIndex) < 0 ||
        Number(q.correctIndex) > 3
      ) {
        throw new Error(`${label}: correctIndex must be 0, 1, 2, or 3.`);
      }
      const duration = q.duration ?? 20;
      if (
        !Number.isInteger(duration) ||
        Number(duration) < 5 ||
        Number(duration) > 300
      ) {
        throw new Error(
          `${label}: time must be a whole number from 5 to 300 seconds.`,
        );
      }
      return {
        id: typeof q.id === "string" ? q.id : quizId(),
        prompt: q.prompt.trim(),
        answers: (q.answers as string[]).map((a) => a.trim()),
        correctIndex: Number(q.correctIndex),
        duration: Number(duration),
      };
    },
  );
  return {
    id: typeof data.id === "string" ? data.id : quizId(),
    title: data.title.trim(),
    description:
      typeof data.description === "string"
        ? data.description.slice(0, 500)
        : "",
    cover: covers.includes(data.cover as Cover)
      ? (data.cover as Cover)
      : "confetti",
    questions,
    updatedAt:
      typeof data.updatedAt === "string"
        ? data.updatedAt
        : new Date().toISOString(),
    isExample: data.isExample === true,
  };
}

export function parseImport(text: string): Quiz {
  if (text.length > 500_000) throw new Error("Keep your import under 500 KB.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "That JSON could not be read. Check quotes, commas, and brackets, then try again.",
    );
  }
  const quiz = parseQuiz(value);
  return {
    ...quiz,
    id: quizId(),
    isExample: false,
    updatedAt: new Date().toISOString(),
    questions: quiz.questions.map((q) => ({ ...q, id: quizId() })),
  };
}

export const importExample = JSON.stringify(
  {
    title: "A little space adventure",
    description: "A quick trip around our solar system.",
    questions: [
      {
        prompt: "Which planet is known as the Red Planet?",
        answers: ["Venus", "Mars", "Jupiter", "Saturn"],
        correctIndex: 1,
        duration: 20,
      },
      {
        prompt: "What is at the center of our solar system?",
        answers: ["The Moon", "Earth", "The Sun", "Polaris"],
        correctIndex: 2,
        duration: 15,
      },
    ],
  },
  null,
  2,
);
