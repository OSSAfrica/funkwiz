# Publishing Funkwiz

The source repository is `https://github.com/OSSAfrica/funkwiz`, licensed under MIT.
The README and deployment guide already point their Deploy to Cloudflare buttons
at that URL. Cloudflare needs the public source to be pushed before it can clone it.

Before making the repository public:

1. Run the checks in [CONTRIBUTING.md](../CONTRIBUTING.md) and inspect staged files.
2. Run a dedicated secret scanner against both the working source and Git history.
   For example, with Gitleaks installed: `gitleaks git --redact` and
   `git diff --binary HEAD | gitleaks stdin --redact`.
3. Confirm no local configuration, account databases, learner reports, browser
   sessions or IDE settings are tracked. `bun run check:public` checks tracked files
   against local private values and common local-artifact paths, without printing
   matching contents. It complements, rather than replaces, a secret scanner.
4. Review Git commit author names and emails: these remain part of history even
   when source files contain no personal details. No history rewrite is automatic.
5. Enable private vulnerability reporting on GitHub and review repository permissions.
6. Push the reviewed `main` branch when ready, then check the deploy-button flow on
   a separate Cloudflare installation with its own teacher and secrets.

CI runs a checksum-pinned Gitleaks history scan, type, unit, Worker integration,
build and tracked-file hygiene checks. It
does not deploy, apply remote migrations, send email or use repository secrets.
Browser scenarios are run separately; current timing limitations are recorded in
[the roadmap](PLAN.md).

The repository keeps legacy `fun-quiz` browser-storage keys so existing drafts,
appearance preferences and audio settings continue to work after the Funkwiz rename.
Those identifiers are internal compatibility details, not public branding.

Personal production configuration is isolated under the ignored `.deploy/`
directory. Follow [private deployment](PRIVATE_DEPLOY.md) to deploy an operator's
own instance while leaving the public template generic. Do not copy private
deployment logs, screenshots or resource metadata into release notes.

## Cleanup validation (2026-11-02)

- 43 library tests, 19 isolated Worker tests and 15 focused desktop/phone browser
  checks passed (social previews, reports, React runtime and optional-auth setup).
- TypeScript, frozen Bun installation, production build and configured client
  private-value checks passed. React Doctor's staged scan found no issues.
- Wrangler's deployment dry run packaged the Funkwiz Worker with D1 and both
  Durable Objects. The built D1 configuration resolves the source migrations.
- Gitleaks 8.30.1 found no leaks across the 11 existing commits or the cleaned
  source snapshot. Its download was verified against the official SHA-256 checksum.
- The tracked-file hygiene guard passed and was exercised with fictional leaked
  values and an environment file in a disposable repository.

This was a local preparation: no remote database was created or migrated, no
email was sent, and the code was not pushed or deployed. The end-to-end deploy
button/provisioning flow still needs verification after publication. The complete
browser suite was not rerun for this cleanup; earlier timing issues remain in the
roadmap. GitHub Actions itself will run after the source is pushed.

## Dependency audit (2026-11-02)

`bun audit` reports three moderate advisories in transitive development tooling:

- `drizzle-kit → @esbuild-kit/esm-loader → esbuild@0.18.20`:
  [esbuild development-server CORS](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
- `react-email → glob@13.0.6`:
  [glob cancellation bypass](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4).
- `react-email → glob → minimatch@10.2.6`:
  [pattern amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249).

The email preview CLI is a development dependency; the email rendering package is
a runtime dependency. These paths are not imported by the deployed Worker. The
audit reported no high/critical advisory at this check. Avoid forcing incompatible
transitive major versions solely to silence the audit; upgrade the owning tools
and rerun schema/email-preview checks when compatible fixes are available.
