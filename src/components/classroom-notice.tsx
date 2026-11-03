import { Wifi } from "lucide-react";
import { useEffect, useRef } from "react";

export function ClassroomNotice({ origin }: { origin: string | null }) {
  const notice = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = notice.current;
    if (!origin || !element) return;
    const update = () =>
      document.documentElement.style.setProperty(
        "--classroom-notice-height",
        `${Math.ceil(element.getBoundingClientRect().height)}px`,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(
        "--classroom-notice-height",
      );
    };
  }, [origin]);
  if (!origin) return null;
  return (
    <aside
      ref={notice}
      className="classroom-notice sticky top-0 z-30 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-border bg-muted px-4 py-2 text-center text-sm text-foreground"
      aria-label="Offline classroom connection"
    >
      <span className="inline-flex items-center gap-2 font-bold">
        <Wifi size={16} className="shrink-0" aria-hidden="true" /> Offline
        Personal classroom
      </span>
      <span>
        Join the same Wi-Fi, then open{" "}
        <a
          className="font-bold underline underline-offset-2"
          href={`${origin}/join`}
        >
          {origin}/join
        </a>{" "}
        or scan the lobby QR.
      </span>
      <span className="text-muted-foreground">
        Keep the teacher’s computer awake.
      </span>
    </aside>
  );
}
