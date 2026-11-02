import { parseWranglerTemplate } from "./wrangler-config";

export type DeploymentMode = "personal" | "school";
export function deploymentMode(value: string): DeploymentMode {
  if (value !== "personal" && value !== "school")
    throw new Error("Choose personal or school for the deployment template.");
  return value;
}
export function configureDeploymentTemplate(
  wrangler: string,
  packageSource: string,
  mode: DeploymentMode,
) {
  deploymentMode(mode);
  const config = parseWranglerTemplate(wrangler);
  if (
    config.account_id ||
    config.d1_databases.some(
      (db) => db.database_id !== "00000000-0000-0000-0000-000000000000",
    )
  )
    throw new Error(
      "Only a generic public configuration can become a deployment template.",
    );
  if (!config.d1_databases.some((db) => db.binding === "DB"))
    throw new Error("A template needs the DB binding.");
  const name = `funkwiz-${mode}`;
  config.name = name;
  config.vars = { ...(config.vars ?? {}), FUNKWIZ_MODE: mode };
  config.d1_databases = config.d1_databases.map((db) =>
    db.binding === "DB" ? { ...db, database_name: name } : db,
  );
  const pkg = JSON.parse(packageSource) as {
    cloudflare: {
      label: string;
      bindings: Record<string, { description: string }>;
    };
  };
  if (!pkg.cloudflare?.bindings)
    throw new Error("Missing Cloudflare template metadata.");
  pkg.cloudflare.label =
    mode === "personal"
      ? "Funkwiz — Personal"
      : "Funkwiz — School / organization";
  pkg.cloudflare.bindings.FUNKWIZ_MODE = {
    description:
      mode === "personal"
        ? "Personal mode is preselected: one teacher account. Use the School / organization deploy link for an invited teaching team."
        : "School mode is preselected: workspaces, invited teachers and roles. Keep the exact value school for this installation.",
  };
  pkg.cloudflare.bindings.TEACHER_EMAIL = {
    description:
      mode === "school"
        ? "The first administrator / installation owner email. Other teachers join through private invitations; do not list their addresses here."
        : "The email for your single teacher account. Use your private setup code only for its first email/password signup, not for normal login.",
  };
  pkg.cloudflare.bindings.TEACHER_SETUP_TOKEN = {
    description:
      mode === "school"
        ? "Generate a unique secret with openssl rand -hex 32. Only the installation owner uses it for first administrator email/password signup and owner recovery. Invited teachers and normal login do not need it."
        : "Generate a unique secret with openssl rand -hex 32. Use it for first email/password signup and private-code recovery; keep it in a password manager.",
  };
  return { config, pkg };
}

/** Explicit private secrets win over defaults supplied by a public template. */
export function variablesWithoutSecrets(
  vars: Record<string, unknown> | undefined,
  secrets: Record<string, unknown>,
) {
  if (!vars) return undefined;
  return Object.fromEntries(
    Object.entries(vars).filter(([key]) => !Object.hasOwn(secrets, key)),
  );
}
