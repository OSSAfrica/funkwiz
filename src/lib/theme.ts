import { useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark" | "system";
export const themeStorageKey = "fun-quiz-appearance";
const themeEvent = "fun-quiz-appearance-change";
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}
let sessionPreference: ThemePreference | undefined;
function preference(): ThemePreference {
  if (sessionPreference) return sessionPreference;
  try {
    const saved = localStorage.getItem(themeStorageKey);
    return isThemePreference(saved) ? saved : "system";
  } catch {
    return "system";
  }
}
function applyTheme() {
  const chosen = preference();
  const resolved =
    chosen === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : chosen;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}
function subscribe(listener: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const update = () => {
    applyTheme();
    listener();
  };
  media.addEventListener("change", update);
  window.addEventListener("storage", update);
  window.addEventListener(themeEvent, update);
  update();
  return () => {
    media.removeEventListener("change", update);
    window.removeEventListener("storage", update);
    window.removeEventListener(themeEvent, update);
  };
}
const snapshot = () =>
  `${preference()}:${document.documentElement.dataset.theme ?? "light"}`;
const serverSnapshot = () => "system:light";
export function useTheme() {
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [chosen, resolved] = state.split(":") as [
    ThemePreference,
    "light" | "dark",
  ];
  return {
    persistent: sessionPreference === undefined,
    preference: chosen,
    resolved,
    setTheme: (value: ThemePreference) => {
      try {
        localStorage.setItem(themeStorageKey, value);
        sessionPreference = undefined;
      } catch {
        sessionPreference = value;
      }
      // Keep the current tab usable even when persistent storage is blocked.
      document.documentElement.dataset.theme =
        value === "system"
          ? matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : value;
      document.documentElement.style.colorScheme =
        document.documentElement.dataset.theme;
      window.dispatchEvent(new Event(themeEvent));
    },
  };
}

// Runs before styles paint; no user content or secrets are interpolated.
export const themeBootScript = `try{var p=localStorage.getItem('${themeStorageKey}');var t=p==='light'||p==='dark'?p:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch{var t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}`;
