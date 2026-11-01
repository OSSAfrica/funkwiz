import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const value = parseEnv(readFileSync(".dev.vars", "utf8")).TEACHER_SETUP_TOKEN;
if (!value) throw new Error("Set TEACHER_SETUP_TOKEN in .dev.vars first.");
console.log(value);
