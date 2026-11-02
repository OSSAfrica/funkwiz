# Curious Garden

Original synthesized composition created for Funkwiz. No external recordings,
melodies, music-library downloads or attribution-dependent samples are used.
Use and distribute it under the project's [MIT license](../../LICENSE).

- 80 BPM, 16 bars, 48 seconds, stereo.
- Soft marimba-style melody, quiet bass and pad, circular room reflections.
- MP3 with gapless encoding metadata; the Web Audio loop ends at 48 seconds.
- The game lowers the music during questions and briefly ducks it under feedback.

Regenerate with `bun run audio:generate` (requires ffmpeg). The score and synthesis
are in `scripts/generate-game-audio.ts`. The script also writes a WAV preview to
the system temporary directory. The committed MP3 is approximately 295 KB and is
fetched only when a user enables music. The audio engine uses no remote services.
