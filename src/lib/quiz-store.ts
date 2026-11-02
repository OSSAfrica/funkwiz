import { useState } from "react";
import { parseQuiz, type Quiz } from "./quiz";
import {
  copyBrowserDrafts,
  listQuizzes,
  persistQuiz,
  removeQuiz,
  copyWorkspaceQuiz,
  shareWorkspaceQuiz,
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
  async function share(quiz: Quiz) {
    setBusy(true);
    setError("");
    try {
      const shared = quiz.visibility !== "workspace";
      await shareWorkspaceQuiz({ data: { id: quiz.id, shared } });
      setSaved((items) =>
        items.map((item) =>
          item.id === quiz.id
            ? { ...item, visibility: shared ? "workspace" : "private" }
            : item,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Sharing did not complete. Try again.",
      );
      throw cause;
    } finally {
      setBusy(false);
    }
  }
  async function copy(quiz: Quiz) {
    setBusy(true);
    setError("");
    try {
      const copied = await copyWorkspaceQuiz({ data: quiz.id });
      setSaved((items) => [copied, ...items]);
      return copied;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The quiz could not be copied.",
      );
      throw cause;
    } finally {
      setBusy(false);
    }
  }
  return {
    quizzes: saved,
    error,
    busy,
    save,
    remove,
    migrate,
    share,
    copy,
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
