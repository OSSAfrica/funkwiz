import { useSyncExternalStore } from "react";
import { parseQuiz, type Quiz } from "./quiz";
import { sampleQuizzes } from "./sample-quizzes";

const storageKey = "fun-quiz.library.v1";
type Library = { quizzes: Quiz[]; error: string | null };
const serverSnapshot: Library = { quizzes: sampleQuizzes, error: null };
let snapshot = serverSnapshot;
let initialized = false;
const listeners = new Set<() => void>();
function load() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return serverSnapshot;
    const data: unknown = JSON.parse(saved);
    if (!Array.isArray(data)) throw new Error("Invalid library");
    return { quizzes: data.map(parseQuiz), error: null };
  } catch {
    return {
      quizzes: sampleQuizzes,
      error:
        "Your saved library could not be read. Examples are shown; export any changes before leaving.",
    };
  }
}
function getSnapshot() {
  if (!initialized) {
    snapshot = load();
    initialized = true;
  }
  return snapshot;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) {
      snapshot = load();
      listeners.forEach((fn) => fn());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
export function useQuizLibrary() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
function update(quizzes: Quiz[]) {
  let error = null;
  try {
    localStorage.setItem(storageKey, JSON.stringify(quizzes));
  } catch {
    error =
      "Browser storage is unavailable or full. Your changes are temporary; export them before leaving.";
  }
  snapshot = { quizzes, error };
  listeners.forEach((fn) => fn());
}
export function saveQuiz(quiz: Quiz) {
  const clean = parseQuiz(quiz);
  const quizzes = getSnapshot().quizzes;
  const exists = quizzes.some((q) => q.id === clean.id);
  update(
    exists
      ? quizzes.map((q) => (q.id === clean.id ? clean : q))
      : [clean, ...quizzes],
  );
}
export function deleteQuiz(id: string) {
  update(getSnapshot().quizzes.filter((q) => q.id !== id));
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
