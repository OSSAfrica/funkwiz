import { readFileSync, writeFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  configureDeploymentTemplate,
  deploymentMode,
} from "./lib/deploy-template";
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    root: { type: "string" },
    mode: { type: "string" },
    source: { type: "string" },
  },
});
if (!values.root || !values.source || !/^[a-f0-9]{40}$/.test(values.source))
  throw new Error("Provide --root, --mode and a full --source commit SHA.");
const root = realpathSync(values.root);
if (root === realpathSync(process.cwd()))
  throw new Error(
    "Configure a separate template worktree, never the source checkout.",
  );
const mode = deploymentMode(values.mode ?? "");
const { config, pkg } = configureDeploymentTemplate(
  readFileSync(resolve(root, "wrangler.jsonc"), "utf8"),
  readFileSync(resolve(root, "package.json"), "utf8"),
  mode,
);
writeFileSync(
  resolve(root, "wrangler.jsonc"),
  JSON.stringify(config, null, 2) + "\n",
);
writeFileSync(
  resolve(root, "package.json"),
  JSON.stringify(pkg, null, 2) + "\n",
);
writeFileSync(
  resolve(root, "deployment-template.json"),
  JSON.stringify(
    {
      mode,
      sourceCommit: values.source,
      sourceRepository: process.env.GITHUB_REPOSITORY ?? "OSSAfrica/funkwiz",
    },
    null,
    2,
  ) + "\n",
);
const readme = resolve(root, "README.md");
writeFileSync(
  readme,
  `> **${mode === "school" ? "School / organization" : "Personal"} deployment template.** Generated from source commit \`${values.source}\`. The mode is preselected in \`wrangler.jsonc\`. Contribute application changes to the upstream main branch.\n\n` +
    readFileSync(readme, "utf8"),
);
console.log(`Configured the ${mode} deployment template.`);
