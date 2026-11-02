export type DeploymentConfig = {
  name?: string;
  account_id?: string;
  d1_databases?: { binding: string; database_id?: string }[];
};

/** Refuse stale/wrong-target builds before invoking any remote command. */
export function assertDeploymentTarget(
  source: DeploymentConfig,
  built: DeploymentConfig,
) {
  const expected = source.d1_databases?.find((db) => db.binding === "DB");
  const actual = built.d1_databases?.find((db) => db.binding === "DB");
  if (
    !source.name ||
    source.name !== built.name ||
    source.account_id !== built.account_id ||
    !expected?.database_id ||
    !actual?.database_id ||
    expected.database_id !== actual.database_id
  )
    throw new Error(
      "Deployment target does not match this build. Rebuild using the intended public or private command; no remote changes were made.",
    );
  if (/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(actual.database_id))
    throw new Error(
      "The D1 binding still has a template ID. Configure a real database before deploying.",
    );
}
