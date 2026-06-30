# Vercel deploy via GitHub Actions — operations runbook (task 8)

**Plan:** OT `fc12183a-aab4-48a2-a7a8-4ae0680dab1c`. Companion to
[`vercel-baseline.md`](./vercel-baseline.md) (current state) and
[`vercel-github-actions-design.md`](./vercel-github-actions-design.md)
(architecture + decisions). This is the **operate / extend / roll back** guide for
[`.github/workflows/vercel-deploy.yml`](../../.github/workflows/vercel-deploy.yml).

> Status: the workflow is authored but **not yet cut over**. Until the per-app
> cutover (plan tasks 6–7), Vercel's dashboard Git integration is still the live
> deploy path for `admin`/`email`/`website`. Do not announce GHA as the deploy
> path until an app is cut over.

## How deploys work (once live)

- **Trigger:** PRs (preview) and pushes to `main` (production), ignoring
  `docs/**` and `**/*.md`.
- **Affected only:** `compute-affected` runs `nx-affected-docker-apps` over
  `openthrottle-admin,openthrottle-email,openthrottle-website`; only changed apps
  get a `deploy` matrix leg (none affected → no deploy).
- **Per app:** `vercel pull` (env + project settings) → `nx run <app>:build` with
  `VERCEL=1` (so `vercelPreset()` writes `.vercel/output`, reusing the GCS Nx
  remote cache) → `vercel deploy --prebuilt` (`--prod` on `main`).
- **Preview URL:** on PRs, a sticky `<!-- vercel-deploy:<app> -->` comment is
  upserted with the deployment URL.

## Required GitHub configuration

| Kind   | Name                                                | Notes                             |
| ------ | --------------------------------------------------- | --------------------------------- |
| secret | `VERCEL_TOKEN`                                      | scoped deploy token               |
| secret | `VERCEL_ORG_ID`                                     | shared org/team id                |
| secret | `VERCEL_PROJECT_ID_OPENTHROTTLE_ADMIN`              | per-app project id                |
| secret | `VERCEL_PROJECT_ID_OPENTHROTTLE_EMAIL`              | per-app project id                |
| secret | `VERCEL_PROJECT_ID_OPENTHROTTLE_WEBSITE`            | per-app project id                |
| secret | `GOOGLE_CREDENTIALS_STAGING`                        | already used by CI (Nx GCS cache) |
| var    | `NX_KEY`, `NX_VERSION`, `GOOGLE_PROJECT_ID_STAGING` | already used by CI                |

Populate the per-project ids from the task-1 dashboard checklist
(`vercel-baseline.md`). Provisioning these is plan task 3.

## Add a new Vercel-deployed app to the workflow

1. Add the Nx project name to the `apps:` input of the `compute-affected` step.
2. Add a `VERCEL_PROJECT_ID_<UPPER_SNAKE_APP>` secret and expose it in the
   `deploy` job `env:` block.
3. Add a `case` arm mapping the app to that env var in the
   "Resolve VERCEL_PROJECT_ID" step.
4. Ensure the app has a Vercel project + `react-router.config.ts` with the
   `vercelPreset()`-when-`VERCEL=1` pattern (all current RR apps already do).

## Cutover checklist (per app — plan task 6)

1. Land the GHA deploy and confirm a **preview** renders and matches the
   dashboard-built preview (and, for `website`, that the CSP header from its
   `vercel.json` is present).
2. In the **same PR**, flip that app's `vercel.json` `git.deploymentEnabled` to
   `false` to stop Vercel's Git auto-deploy (prevents double-deploys). This is the
   in-repo, reviewable cutover switch.
3. Merge; confirm `main` production deploy comes from GitHub Actions only.
4. Repeat per app. (Order: `website` pilot first, then `admin`/`email`; the
   `developer` app stays out pending the design's preview-only decision.)

## 🔙 Rollback runbook

If the GitHub Actions path misbehaves, restore Vercel's Git integration — fast,
and a normal revert because the switch is a committed file:

1. **Re-enable Vercel Git deploys**: set the affected app's `vercel.json`
   `git.deploymentEnabled` back to `true` (revert the cutover one-liner) and
   merge. Vercel resumes dashboard-built deploys on the next push immediately.
2. **Stop the GHA deploys** (optional, if they're the problem): either revert the
   workflow addition, or gate it to manual only by temporarily removing the
   `pull_request`/`push` triggers (leave the file so it can be re-enabled).
3. No dashboard archaeology is needed — both the cutover and the rollback are
   git operations.

**Never** flip `deploymentEnabled:false` before a GHA deploy has proven out for
that app; that would leave a window with no deploy path.

## Config notes

- `clean:vercel` (root `package.json`) is **retained** — it removes local
  `**/.vercel` directories that `vercel pull`/`build` create; still useful, not
  obsolete.
- No existing top-level doc (AGENTS.md/CONTRIBUTING.md/MONOREPO.md) documents the
  Vercel **deploy trigger** today, so there is nothing to rewrite pre-cutover.
  When the first app is cut over, add a one-line pointer to this runbook from the
  contributor docs as part of that PR.
