import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (existsSync(".dev.vars")) {
  console.log(
    "Keeping the existing .dev.vars. Run bun run db:migrate:local to prepare the database.",
  );
} else {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Usage: bun run setup:local your-teacher-email@example.com");
    process.exitCode = 1;
  } else {
    const content = [
      "BETTER_AUTH_URL=http://127.0.0.1:3000",
      `BETTER_AUTH_SECRET=${randomBytes(32).toString("base64url")}`,
      `TEACHER_EMAIL=${email}`,
      `TEACHER_SETUP_TOKEN=${randomBytes(32).toString("base64url")}`,
      "GOOGLE_CLIENT_ID=",
      "GOOGLE_CLIENT_SECRET=",
      "",
    ].join("\n");
    writeFileSync(".dev.vars", content, { mode: 0o600, flag: "wx" });
    console.log(
      "Created private local configuration. Secrets were not printed.",
    );
    console.log("Next: bun run db:migrate:local, then bun run dev.");
    console.log(
      "Run bun run setup:code in your terminal to read your teacher setup code.",
    );
  }
}
