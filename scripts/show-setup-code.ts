import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const production = process.argv.includes("--production");
const classroom = process.argv.includes("--classroom");
const value = classroom
  ? JSON.parse(readFileSync(".classroom/settings.json", "utf8"))
      .TEACHER_SETUP_TOKEN
  : production
    ? JSON.parse(readFileSync(".deploy/secrets.json", "utf8"))
        .TEACHER_SETUP_TOKEN
    : parseEnv(readFileSync(".dev.vars", "utf8")).TEACHER_SETUP_TOKEN;
if (!value) throw new Error("The teacher setup token has not been configured.");
console.log(value);
