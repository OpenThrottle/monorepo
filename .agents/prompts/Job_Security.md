# Security sweep

Find leaked secrets, exploitable dependencies, and unguarded surfaces in this monorepo — then file the findings as a single OpenThrottle plan.

## Cadence

Weekly. Daily is defensible if the CVE noise is tolerable, but a weekly run is the right default: secrets and missing auth guards are introduced at merge time, so a week is the longest a live credential should sit undetected, while advisory churn on a monorepo this size produces more noise than signal at a daily cadence.

## Repo context

OpenThrottle is an Nx + pnpm workspace monorepo (Node >= 22, pnpm only). Run every task through Nx, prefixed with `pnpm` — never the underlying tooling directly.

Commands this job uses:

```bash
gitleaks detect --config .gitleaks.toml --no-banner       # secret scan (config committed at repo root)
gitleaks protect --staged --config .gitleaks.toml         # uncommitted/staged secrets
pnpm audit                                                # dependency advisories
pnpm run check:rbac-admin-coverage                        # scripts/check-admin-permission-coverage.ts
pnpm run check:bootstrap-secrets                          # scripts/check-bootstrap-secrets.ts
pnpm nx run <project>:lint
```

Facts that change the analysis:

- The repo **already has a gitleaks gate** — `.gitleaks.toml` at the root and `.github/workflows/secret-scan.yml` in CI. Run it and triage its output; do not re-invent secret detection with ad-hoc greps (do use targeted greps to confirm or expand on a gitleaks hit).
- There are **two git remotes**: `origin` is `OpenThrottle/monorepo` (canonical) and a separate public mirror with unrelated history. Anything leaked is potentially public — treat a hit in history as exposed, not merely committed.
- The server is `applications/openthrottle-server`: NestJS, **code-first GraphQL** (`autoSchemaFile`). Authorization lives in guards and the RBAC modules (`packages/nestjs-auth`, `packages/nestjs-rbac`). A resolver without a guard is open.
- The four React Router apps (`openthrottle-developer`, `openthrottle-admin`, `openthrottle-email`, `openthrottle-website`) expose config to the client through `window.env`. Anything placed there is public. Server-only values must never reach it.
- Form input is parsed through `parseFormData` in `@openthrottle/react-router-graphql`, which validates with Zod. An action that reads raw form data without a schema is unvalidated input.
- A nonce-based CSP rollout is in progress across the RR apps — missing or bypassed nonce usage is a real finding, not a hypothetical.
- SQL lives in `databases/migrations/`; runtime queries go through TypeORM. Raw string-interpolated SQL is the pattern to hunt.
- Secrets in local development come from `.env` files that are **not** committed; a committed `.env` with real values is always a critical finding.

## What to inspect

1. **Secrets.** Run gitleaks over the working tree and recent history. Triage every hit into: confirmed live credential, expired/rotated credential, or false positive (fixture, example, placeholder). Also check for committed `.env` files with real values, tokens pasted into docs or test fixtures, and private keys.
2. **Dependency CVEs.** Run `pnpm audit`. Rank by **reachability from a deployed app**, not raw CVSS: a critical in a transitive dev-only tool matters less than a moderate in a runtime dependency of `openthrottle-server`. State the path from an entry point for anything you rank highly.
3. **Auth surface.** GraphQL resolvers and REST/HTTP routes with no guard or an overly-broad one; gaps reported by `pnpm run check:rbac-admin-coverage`; permissions enforced in the UI but not on the server (client-side-only authorization is not authorization); subscriptions and websocket handlers missing the same checks as their query/mutation equivalents.
4. **Injection and unsafe handling.** Raw string-interpolated SQL; actions and loaders consuming input without a Zod schema through `parseFormData`; `dangerouslySetInnerHTML` on any non-constant value; unsanitized values reaching shell commands or file paths; user input used in redirects.
5. **Config and env leaks.** Server-only secrets reachable from a client bundle or `window.env`; secrets logged; error responses returning stack traces or internal identifiers to unauthenticated callers; overly-permissive CORS.

## Ranking

Order findings by exploitability, not by category:

1. **Confirmed live secret** — always finding #1, always filed, never dropped by the cap, no matter how many other findings exist.
2. Missing or bypassable authorization on a mutation or a data-returning resolver.
3. Injection reachable from unauthenticated input.
4. Server secret exposed to the client bundle.
5. Reachable CVE in a production runtime dependency.
6. Everything else — dev-only CVEs, defense-in-depth gaps, hardening suggestions.

Cap the run at **10 findings**, with the standing exception above: confirmed live secrets are never dropped. If you find more, keep the top 10 and say in the plan description how many you dropped.

## Hard rules

- **Read-only on source code.** Never edit, fix, or refactor anything — including "obvious" one-line security fixes. Filing the finding is the job.
- **Never write an actual secret value into OpenThrottle**, a log, or your final message. Reference file, line, and credential _type_ only (e.g. "AWS access key id at `path/to/file.ts:42`"). The plan text is not a safe place for a credential.
- Never attempt to exploit, authenticate with, or otherwise use a discovered credential — including to verify whether it is live. Judge liveness from context (where it points, when it was added, whether it was rotated) and say so with your confidence.
- Never open a pull request, never commit, never push, never rotate or revoke a credential yourself — flag it for a human, who owns the revocation.
- Never write a plan or task as a Markdown file anywhere — plans and tasks live in OpenThrottle only.
- If the `openthrottle-mcp` MCP server is unavailable, **fail loudly**: report the error and stop. Do not fall back to any other medium.
- Do not run destructive or stateful commands (no migrations, no `database:reset`, no installs, no lockfile changes).
- Author and assignee fields expect the GitHub username `visormatt`, not a display name.

## Dedupe

Before filing anything, check what already exists:

- `list_plans_by_status` for `PENDING` and `IN_PROGRESS` plans — a previous run of this job files plans titled `🔁 Security sweep: …`, and there is prior infra-leak audit work in the backlog.
- `semantic_search` on each finding's subject (the file path plus the vulnerability class) to catch a plan filed by a human or another job.

Then:

- If an open plan already covers a finding, **skip it** — do not re-file.
- If an open plan covers the area but misses a materially new finding, add that finding as a task to the existing plan (`create_tasks`) rather than opening a second plan.
- Only open a new plan for findings genuinely not represented anywhere.
- **Exception:** a newly discovered live secret is always filed, even if a similar one was reported before. Never let dedupe swallow a credential.

Dedupe is not finished when you have checked for a duplicate _plan_. Three rules that apply every run — none of which override the live-secret exception above; a newly discovered credential is always filed:

- **Compare against the existing plan's tasks, not just its title.** When an open plan from this job exists, call `get_tasks_by_plan_id` on it and check each finding against the tasks already there, matching on the finding's subject (the file path plus the vulnerability class). File a task only for a subject no existing task covers. A run that re-files a finding the plan already carries has duplicated it, even though it opened no second plan.
- **Never file a task that contradicts an existing one.** If this sweep reaches a different verdict on a subject an existing task already covers, do not file an opposing task alongside it. Append the disagreement and your evidence to that task's description with `update_task`, so a human resolves one task instead of discovering the conflict halfway through executing the plan.
- **Say so when dedupe is degraded.** If `semantic_search` returns nothing for every query you try, treat the index as unavailable rather than as proof that no duplicate exists, and state that plainly in the plan description. "No duplicates found" and "I could not check for duplicates" must never look the same to whoever reads the plan.

## Output

Exactly one `create_plan`, followed by one `create_tasks` batch:

- **Title:** `🔁 Security sweep: <YYYY-MM-DD>` (today's date).
- **Author / assignee:** `visormatt`.
- **Category:** `security`.
- **Description:** how the sweep was run, the commands used, the gitleaks false-positive rate, how many findings were dropped by the cap, and anything skipped as a duplicate. If a live secret was found, say so at the top — without the value.
- **Tasks:** one per finding, ordered by the ranking above, each fully self-contained:
  - exact file path and line,
  - the vulnerability class and how it is reached (the path from untrusted input, or from a deployed entry point for a CVE),
  - the remediation, and for a credential also the revoke-and-rotate step a human must perform,
  - explicit acceptance criteria.

If nothing material is found, **file nothing** and say so plainly in your final message. An empty run is a valid outcome; a padded plan is not.
