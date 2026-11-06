# Scoring and rankings

[Documentation index](README.md) · [FAQ](FAQ.md) · [Live games](LIVE_GAMES.md)

New Funkwiz games reward accuracy first. Points reward speed among equally
accurate players. Older games keep the rules they started with.

## What decides the winner?

The leaderboard compares these in order:

1. **Correct answers:** more correct answers always rank higher.
2. **Points:** among equally accurate players, higher time-based points rank higher.
3. **Precise timing:** if rounded points also tie, lower accumulated normalized
   response time on correct answers ranks higher.

If all three values match, players share a rank. Join order only keeps their
names displayed consistently; it does not award one a better rank. Shared ranks
use competition numbering, such as 1, 1, 3. The podium includes tied finishers.

For example, **8 correct / 5,600 points** ranks above **7 correct / 7,000 points**.
This is why both correct-answer counts and points are shown on new leaderboards.
A higher point total alone does not determine the winner.

## Points per question

A correct answer earns a 700-point base and a speed bonus of up to 300:

```text
points = 700 + round(300 × remaining active time / configured question duration)
```

On a 20-second question:

| Answer accepted after | Correct-answer points |
| --------------------- | --------------------- |
| 2 seconds             | 970                   |
| 5 seconds             | 925                   |
| 10 seconds            | 850                   |
| 15 seconds            | 775                   |
| 19 seconds            | 715                   |

Wrong and unanswered questions earn zero. Scores update at reveal, including
when the host reveals or ends a question early. Early reveal does not change the
original question duration used in the formula.

## Timing and fairness

- The server records when the answer arrives. Player-supplied timestamps are not trusted.
- Time is measured in milliseconds; points are rounded to whole numbers.
- Each response is normalized by its question duration. Five seconds on a 20-second
  timer is equivalent to ten seconds on a 40-second timer.
- Paused time is excluded. A disconnect does not pause the question timer.
- With answer changes enabled, the final saved choice and its acceptance time count.
  Changing from a correct answer to another and back gives it a new time.
- Retrying the currently saved choice does not change its time or award more points.
- Only correct answers contribute to the timing tie-break. A fast wrong answer gives
  no points or timing advantage.
- Network delays can affect time-based points, but cannot let fewer correct answers
  outrank more correct answers. Truly identical results remain tied.

## Reports and compatibility

Games store their scoring rules when their lobby opens. Installing a newer version
never silently changes an existing room or recalculates a saved report. Historical
rooms may use flat points or the earlier 1,000 / 900 / 800 / 700 correct-answer tiers.
Their leaderboard, PDF and CSV use those original rules.

New JSON reports include `scoring.type: "accuracy-first"`, with `basePoints: 700`
and `speedBonus: 300`. Leaderboard rows include `correctCount` and `speedCost`.
CSV adds correct answers and normalized response time totals; PDF includes correct
counts and explains the rules. Rank values are saved, not reconstructed by sorting
points on a client. Tools consuming reports must respect the saved rank.

For precise comparisons, `speedCost` is the sum of each correct response's
`round(clamp(response_ms / duration_ms, 0, 1) × 1,000,000)`. Lower is faster.
Points use the same normalized value, scaled to the 300-point bonus. CSV expresses
this cost divided by 1,000,000. It is a proportion total, not elapsed seconds.

Timing lives in the game room's SQLite storage. Reveal updates scores, correct
counts, timing totals and awarded flags transactionally. Additive upgrades preserve
old room data, and retries or eviction do not award an answer twice.

Practice is a local rehearsal of question flow and visibility. Competitive
multiplayer ranking and saved reports apply to live games.
