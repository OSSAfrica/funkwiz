# Contribution and repository requirements

[Documentation index](README.md) · [Contributing](../CONTRIBUTING.md)

This setup follows [SkillGuard's contribution model](https://github.com/OSSAfrica/skillguard/blob/main/CONTRIBUTING.md),
adapted for Funkwiz's Bun/TypeScript application. Configuration was checked on
**2 November 2026**. The [live repository rules](https://github.com/OSSAfrica/funkwiz/rules)
and PR merge box remain authoritative if settings change.

## Merge protection

Classic branch protection and the **Main Protection** ruleset apply together to
`main`. Read both when auditing or changing policy.

| Area                         | Configuration                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Target                       | Default branch `main`; contributions use pull requests                                                                   |
| Reviews                      | One qualifying approval, with stale approvals dismissed on new commits                                                   |
| Unattributed Copilot changes | One additional approval for unattributed Copilot PRs                                                                     |
| Signatures                   | Verified signatures required by Main Protection                                                                          |
| Required status checks       | `check` and `secrets`, from GitHub Actions; branch must be up to date                                                    |
| CodeQL                       | Required code-scanning results; high/critical security findings and error/warning alerts block merging                   |
| Code Quality                 | Required analysis with an error-level finding threshold                                                                  |
| Branch integrity             | Force pushes and deletion blocked                                                                                        |
| Merge methods                | Merge, squash and rebase allowed; linear history not required                                                            |
| Administration               | Classic protection includes administrators; Main Protection retains the reference repository's organization-admin bypass |

Neither layer requires CODEOWNERS or last-push approval. There is no CODEOWNERS
file that invents a maintainer/team assignment. Review-thread resolution remains
a contribution expectation rather than a separately enabled merge rule.

Bypass capabilities are for exceptional administration, not routine contributions.
Tool comments and AI reviews do not replace qualifying reviewer approval.

## DCO policy and enforcement

Every contribution commit needs both a matching DCO trailer and a GitHub-verified
signature. Lowercase `git commit -s` adds the trailer; uppercase `-S` signs.
Use `git commit -S -s` for both.

The OSSAfrica organization installs the DCO app for all repositories, including
Funkwiz. Web-based commit sign-off is also enabled. No repository DCO configuration
enables individual or third-party remediation commits.

As in SkillGuard, **DCO is contribution policy but is not a named required status
context**. Maintainers must check its result before merging. Required CI names are
Funkwiz's existing `check` and `secrets`, rather than SkillGuard's Go-specific
`test` and `build`. Adding DCO as a required status context would be a separate
policy change.

## Automated checks

| Source                                    | Scope                                                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [Checks](../.github/workflows/ci.yml)     | Public-file hygiene, typecheck, library/Worker tests, build and client-secret guard; separate Gitleaks history scan       |
| [CodeQL](../.github/workflows/codeql.yml) | JavaScript/TypeScript and GitHub Actions on PRs to `main`, pushes and a weekly schedule                                   |
| GitHub-managed Code Quality               | JavaScript/TypeScript analysis, with the matching repository finding gate                                                 |
| DCO app                                   | Commit sign-off validation on PRs                                                                                         |
| Organization security apps                | GitGuardian, Kusari and Socket are installed for all organization repositories; inspect applicable findings when reported |
| [Dependabot](../.github/dependabot.yml)   | Weekly Bun and GitHub Actions updates; related TanStack/React and CodeQL updates grouped                                  |

Actions are pinned to immutable commit SHAs. CI uses Bun 1.3.14 and Node.js 24.
Workflows use `pull_request`, not `pull_request_target`, and do not receive
production credentials. Fork runs may wait for maintainer approval.

The ordinary workflow does not run the complete browser suite. Use the
[change-to-checks guide](DEVELOPMENT.md#choose-the-right-checks) for relevant local
browser validation and state any limits in the PR. A green CI run does not imply
real Google consent, inbox delivery, production capacity or deployment validation.

## Repository security and community files

- Secret scanning, push protection and Dependabot security updates are enabled.
- Private vulnerability reporting is enabled; follow [Security](../SECURITY.md).
- PR and bug/feature templates explain contribution requirements and data hygiene.
- The [Code of Conduct](../CODE_OF_CONDUCT.md) follows Contributor Covenant 2.1,
  with its attribution preserved.
- [Contributing](../CONTRIBUTING.md) explains signing, checks, review, repair of
  contribution commits and operator-controlled deployments.

GitHub settings do not follow a fork automatically. Self-hosting Funkwiz does not
require reproducing OSSAfrica's repository administration or installing its apps.
Do not add Cloudflare credentials to Actions to make ordinary contribution checks pass.

## Releases and deployment

SkillGuard's binary/container release jobs are specific to that project. Funkwiz
does not copy them: merging a PR validates the application and does not deploy an
operator's installation. See [deployment](DEPLOY.md) and
[private deployment](PRIVATE_DEPLOY.md).

## Recheck the configuration

Maintainers can inspect the current state without changing it:

```sh
gh api repos/OSSAfrica/funkwiz/branches/main/protection
gh api repos/OSSAfrica/funkwiz/rulesets
gh api repos/OSSAfrica/funkwiz/rules/branches/main
gh api repos/OSSAfrica/funkwiz/code-quality/setup
gh api repos/OSSAfrica/funkwiz/private-vulnerability-reporting
gh api repos/OSSAfrica/funkwiz --jq '.security_and_analysis'
```

Inspect the ruleset details and actual PR checks too. Do not infer all merge gates
from a successful build or from classic branch protection alone. Update this
record and the contributor guide together when changing policy.
