import { ShareResult } from "./share-result";
import {
  correctAnswerPoints,
  scoringFor,
  scoringSummary,
} from "@/lib/live/scoring";
import { useState } from "react";
import { Hourglass, Sparkles, Trophy, Users } from "lucide-react";
import { submitAnswer } from "@/lib/live/client";
import { useLiveRoom, useRoomCountdown } from "@/lib/live/use-live-room";
import { useGameAudio } from "@/lib/live/use-game-audio";
import {
  ConnectionNotice,
  Leaderboard,
  LiveAnswers,
  LiveHeader,
  LiveTimer,
  RoomLoading,
  RoomUnavailable,
} from "./live-common";
import type { RoomView } from "@/lib/live/protocol";

export function StudentGame({ code }: { code: string }) {
  const room = useLiveRoom(code, "student"),
    seconds = useRoomCountdown(room.snapshot, room.offset);
  const audio = useGameAudio(room.snapshot, room.offset, room.connected);
  const [pending, setPending] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  if (["unauthorized", "closed"].includes(room.status))
    return (
      <RoomUnavailable
        code={code}
        host={false}
        error={room.error}
        onRetry={room.reconnect}
      />
    );
  if (!room.snapshot) return <RoomLoading />;
  const snapshot = room.snapshot;
  async function answer(index: number) {
    const question = room.snapshot?.question;
    if (!question || pending || !room.connected) return;
    setPending(question.id);
    setAnswerError(null);
    try {
      room.accept(await submitAnswer(code, question.id, index));
    } catch (cause) {
      setAnswerError({ id: question.id, message: (cause as Error).message });
      room.reconnect();
    } finally {
      setPending(null);
    }
  }
  return (
    <main className="live-page student-live">
      <LiveHeader
        code={code}
        host={false}
        connected={room.connected}
        {...audio}
        onSound={() => {
          void audio.toggleSound();
        }}
        onMusic={() => {
          void audio.toggleMusic();
        }}
      />
      <ConnectionNotice
        connected={room.connected}
        error={room.error}
        onRetry={room.reconnect}
      />
      <div className="live-main">
        {snapshot.phase === "lobby" ? (
          <StudentLobby snapshot={snapshot} />
        ) : snapshot.phase === "finished" || snapshot.phase === "closed" ? (
          <StudentFinish snapshot={snapshot} />
        ) : (
          <StudentRound
            snapshot={snapshot}
            seconds={seconds}
            connected={room.connected}
            pending={Boolean(pending)}
            answerError={answerError}
            onAnswer={(index) => {
              void answer(index);
            }}
          />
        )}
      </div>
      <footer className="live-footer">
        Play fair. Stay curious. Cheer each other on.
      </footer>
    </main>
  );
}
function StudentRound({
  snapshot,
  seconds,
  connected,
  pending,
  answerError,
  onAnswer,
}: {
  snapshot: RoomView;
  seconds: number;
  connected: boolean;
  pending: boolean;
  answerError: { id: string; message: string } | null;
  onAnswer: (index: number) => void;
}) {
  return (
    <>
      <div className="student-game-meta">
        <span>
          Question {snapshot.questionIndex + 1} / {snapshot.questionCount}
        </span>
        <strong>
          {snapshot.self?.score.toLocaleString() ?? 0} <small>pts</small>
        </strong>
      </div>
      {!snapshot.hostOnline && (
        <p className="teacher-offline-note">
          Your teacher is reconnecting. Stay here—your place is saved.
        </p>
      )}
      <section className="live-question-stage">
        <div className="live-question-top">
          <span className="eyebrow">
            {snapshot.phase === "reveal"
              ? "THE BIG REVEAL"
              : snapshot.paused
                ? "A LITTLE BREATHING ROOM"
                : "YOU’VE GOT THIS"}
          </span>
          <LiveTimer snapshot={snapshot} seconds={seconds} />
        </div>
        <h1>{snapshot.question?.prompt ?? "Eyes on the shared screen!"}</h1>
        {!snapshot.question?.prompt && <p>Pick the matching answer below.</p>}
        <LiveAnswers
          snapshot={snapshot}
          interactive={snapshot.phase === "question"}
          disabled={
            !connected ||
            snapshot.paused ||
            snapshot.self?.answer !== null ||
            pending ||
            seconds <= 0
          }
          onAnswer={onAnswer}
        />
        <AnswerFeedback
          snapshot={snapshot}
          pending={pending}
          seconds={seconds}
        />
        {answerError && answerError.id === snapshot.question?.id && (
          <p role="alert" className="form-error mt-4">
            {answerError.message}
          </p>
        )}
      </section>
      {snapshot.phase === "reveal" && (
        <Leaderboard
          players={snapshot.leaderboard}
          scoring={scoringFor(snapshot)}
          selfId={snapshot.self?.id}
        />
      )}
    </>
  );
}

function StudentLobby({ snapshot }: { snapshot: RoomView }) {
  return (
    <section className="student-lobby">
      <span className="student-avatar" aria-hidden="true">
        <Sparkles size={42} />
      </span>
      <span className="eyebrow">
        YOU’RE IN, {snapshot.self?.nickname.toUpperCase()}!
      </span>
      <h1>
        A room full of
        <br />
        <span>possibilities.</span>
      </h1>
      <p>
        You’re playing <strong>{snapshot.title}</strong>.<br />
        Your teacher will start the game when everyone’s ready.
      </p>
      <p className="text-sm text-muted-foreground">
        {scoringSummary(scoringFor(snapshot))}
      </p>
      <span className="lobby-player-count">
        <Users size={19} />
        <strong>{snapshot.playerCount}</strong>
        {snapshot.playerCount === 1 ? "curious mind" : "curious minds"} in the
        room
      </span>
      <div className="student-lobby-roster">
        {snapshot.roster.map((player) => (
          <span
            className={player.id === snapshot.self?.id ? "is-you" : ""}
            key={player.id}
          >
            {player.nickname}
            {player.id === snapshot.self?.id ? " (you)" : ""}
          </span>
        ))}
      </div>
      <p className="lobby-waiting">
        <Hourglass size={16} />
        Waiting for your teacher to start…
      </p>
    </section>
  );
}
function AnswerFeedback({
  snapshot,
  pending,
  seconds,
}: {
  snapshot: RoomView;
  pending: boolean;
  seconds: number;
}) {
  let text: string,
    mood = "";
  if (snapshot.phase === "reveal") {
    if (snapshot.self?.correct === true) {
      text = `Nice one! +${(snapshot.self.pointsEarned ?? correctAnswerPoints(0, scoringFor(snapshot))).toLocaleString()} points`;
      mood = "correct-celebration";
    } else if (snapshot.self?.answer !== null) {
      text = "A good try. You’ve got the next one!";
      mood = "try-again";
    } else text = "Time’s up. Catch the next question!";
  } else if (snapshot.paused) text = "Paused. A little time to think.";
  else if (pending) text = "Locking in your answer…";
  else if (snapshot.self?.answer !== null)
    text = "Answer locked in. The suspense is real!";
  else if (seconds <= 0) text = "Time’s up. Waiting for the reveal…";
  else text = "Choose one answer. Make it count!";
  return (
    <div className={`answer-feedback ${mood}`} role="status">
      {text}
      {snapshot.phase === "reveal" && (
        <small>
          {snapshot.deadline !== null
            ? snapshot.questionIndex === snapshot.questionCount - 1
              ? `Final results in ${seconds}s`
              : `Next question in ${seconds}s`
            : "Your teacher will take it from here."}
        </small>
      )}
    </div>
  );
}
function StudentFinish({ snapshot }: { snapshot: RoomView }) {
  return (
    <>
      <section className="student-finish">
        <span className="finish-trophy">
          <Trophy size={55} />
        </span>
        <span className="eyebrow">
          {snapshot.phase === "closed"
            ? "THIS ROUND WAS CLOSED"
            : "THAT’S A WRAP!"}
        </span>
        <h1>
          {snapshot.phase === "closed"
            ? "See you in the next round."
            : "Look at that brain power."}
        </h1>
        <p>{snapshot.self?.nickname}, you brought the curiosity.</p>
        <div className="student-score-cards">
          <div>
            <strong>{snapshot.self?.score.toLocaleString() ?? 0}</strong>
            <span>Total points</span>
          </div>
          <div>
            <strong>#{snapshot.self?.rank ?? "—"}</strong>
            <span>Your rank</span>
          </div>
          <div>
            <strong>{snapshot.self?.correctCount ?? 0}</strong>
            <span>Correct answers</span>
          </div>
        </div>
        <ShareResult snapshot={snapshot} />
      </section>
      <Leaderboard
        players={snapshot.leaderboard}
        selfId={snapshot.self?.id}
        scoring={scoringFor(snapshot)}
      />
    </>
  );
}
