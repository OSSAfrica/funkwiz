import { useState } from "react";
import { parseQuiz, type Quiz } from "./quiz";
import { sampleQuizzes } from "./sample-quizzes";
import {
  copyBrowserDrafts,
  listQuizzes,
  persistQuiz,
  removeQuiz,
} from "./quizzes.functions";

export function useQuizLibrary(initial: Quiz[]) {
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(quiz: Quiz) {
    setBusy(true);
    setError("");
    try {
      const clean = await persistQuiz({ data: quiz });
      setSaved((quizzes) => [
        clean,
        ...quizzes.filter((q) => q.id !== clean.id),
      ]);
    } catch {
      throw new Error(
        "Your quiz couldn’t be saved. Check your connection and sign-in, then try again. Your edits are still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await removeQuiz({ data: id });
      setSaved((quizzes) => quizzes.filter((q) => q.id !== id));
    } catch {
      setError(
        "Your quiz couldn’t be removed. Please check your connection and try again.",
      );
      throw new Error("Delete failed");
    } finally {
      setBusy(false);
    }
  }
  async function migrate(drafts: Quiz[]) {
    setBusy(true);
    setError("");
    try {
      const result = await copyBrowserDrafts({ data: drafts });
      setSaved(await listQuizzes());
      return result.imported;
    } catch {
      setError(
        "The copy could not be confirmed. Your browser drafts are still safe; retry to check which drafts remain.",
      );
      throw new Error("Copy failed");
    } finally {
      setBusy(false);
    }
  }
  return {
    quizzes: [...saved, ...sampleQuizzes],
    error,
    busy,
    save,
    remove,
    migrate,
  };
}
export function readBrowserDrafts(): { drafts: Quiz[]; error: string } {
  try {
    const text = localStorage.getItem("fun-quiz.library.v1");
    if (!text) return { drafts: [], error: "" };
    const raw: unknown = JSON.parse(text);
    if (!Array.isArray(raw)) throw new Error("Invalid library");
    return {
      drafts: raw.map(parseQuiz).filter((q) => !q.isExample),
      error: "",
    };
  } catch {
    return {
      drafts: [],
      error:
        "The old browser library could not be read. Its saved data has not been changed.",
    };
  }
}
export function exportQuiz(quiz: Quiz) {
  const blob = new Blob([JSON.stringify(quiz, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${quiz.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "quiz"}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
