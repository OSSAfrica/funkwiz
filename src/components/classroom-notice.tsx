import { Wifi } from "lucide-react";

export function ClassroomNotice({ origin }: { origin: string | null }) {
  if (!origin) return null;
  return (
    <aside
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-border bg-muted px-4 py-2 text-center text-sm text-foreground"
      aria-label="Offline classroom connection"
    >
      <span className="inline-flex items-center gap-2 font-bold">
        <Wifi size={16} aria-hidden="true" /> Offline Personal classroom
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
