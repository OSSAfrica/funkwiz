import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Gamepad2, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { liveRequest } from "@/lib/live/client";
import { nickname, roomCode } from "@/lib/live/protocol";
import { LiveBrand } from "./live-common";

export function JoinGame({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode),
    [name, setName] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate();
  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const cleanCode = roomCode(code),
        cleanName = nickname(name);
      await liveRequest(`/api/live/rooms/${cleanCode}/join`, {
        nickname: cleanName,
      });
      await navigate({ to: "/play/$code", params: { code: cleanCode } });
    } catch (cause) {
      setError(
        (cause as Error).message || "We couldn’t join that room. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="join-page">
      <header>
        <LiveBrand />
        <Button variant="ghost" asChild>
          <Link to="/login" search={{}}>
            Teacher sign-in
            <ArrowRight size={15} />
          </Link>
        </Button>
      </header>
      <div className="join-layout">
        <section className="join-intro">
          <span className="join-spark" aria-hidden="true">
            <Sparkles size={38} />
          </span>
          <span className="eyebrow">CURIOUS MINDS, THIS WAY</span>
          <h1>
            Your next <span>“aha!”</span>
            <br />
            is waiting.
          </h1>
          <p>
            Grab your game code. Pick a great nickname.
            <br />
            Let’s see what you know.
          </p>
          <div className="join-shapes" aria-hidden="true">
            <span>▲</span>
            <span>◆</span>
            <span>●</span>
            <span>■</span>
          </div>
        </section>
        <section className="join-card reveal-in">
          <span className="join-game-icon">
            <Gamepad2 size={30} />
          </span>
          <h2>Let’s get you in.</h2>
          <p>No account. Just your curious self.</p>
          <form onSubmit={join}>
            <fieldset disabled={busy} className="space-y-5 min-w-0">
              <div className="space-y-2">
                <Label htmlFor="join-code">Game code</Label>
                <Input
                  id="join-code"
                  className="join-code-input"
                  inputMode="numeric"
                  autoComplete="off"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  minLength={6}
                  required
                  value={code}
                  placeholder="000000"
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, ""))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-nickname">Your nickname</Label>
                <Input
                  id="join-nickname"
                  autoComplete="nickname"
                  minLength={2}
                  maxLength={24}
                  required
                  value={name}
                  placeholder="Something your teacher will recognize"
                  onChange={(event) => setName(event.target.value)}
                />
                <p className="auth-field-help">
                  2–24 characters. Keep it friendly.
                </p>
              </div>
              <p role="alert" className="form-error">
                {error}
              </p>
              <Button type="submit" className="join-submit">
                {busy ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
                {busy ? "Finding your game…" : "Join the fun"}
              </Button>
            </fieldset>
          </form>
          <p className="join-footnote">
            Refresh safely. Your place stays with this browser.
          </p>
        </section>
      </div>
      <footer>Good questions bring people together.</footer>
    </main>
  );
}
