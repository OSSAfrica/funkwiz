import { useState } from "react";
import { LoaderCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoomView } from "@/lib/live/protocol";

export function ShareResult({ snapshot }: { snapshot: RoomView }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const player = snapshot.self;
  if (!player) return null;
  async function download() {
    if (!player || busy) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const { downloadResultImage } = await import("@/lib/live/result-image");
      await downloadResultImage({
        title: snapshot.title,
        nickname: player.nickname,
        rank: player.rank,
        score: player.score,
        correctCount: player.correctCount,
        playerCount: snapshot.playerCount,
      });
      setMessage("Your result image is downloaded and ready to share.");
    } catch {
      setFailed(true);
      setMessage("Your image could not be downloaded. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-5 space-y-2 text-center">
      <Button disabled={busy} onClick={() => void download()}>
        {busy ? (
          <LoaderCircle className="animate-spin" size={18} />
        ) : (
          <Share2 size={18} />
        )}
        {busy ? "Creating your image…" : "Share my result"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Download a picture of your quiz moment to share.
      </p>
      {message && (
        <p role={failed ? "alert" : "status"} className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
