# Vercel deploy via GitHub Actions — design (task 2)

**Plan:** OT `fc12183a-aab4-48a2-a7a8-4ae0680dab1c`. Builds on
[`vercel-baseline.md`](./vercel-baseline.md). Settles the architecture before any
YAML is written (tasks 4–5) or secrets provisioned (task 3).

## 1. Build/deploy mechanism — Vercel CLI prebuilt, Nx-built

**Decision:** `vercel pull` → **Nx build with `VERCEL=1`** → `vercel deploy --prebuilt`.

```bash
vercel pull --yes --environment=<preview|production> --token=$VERCEL_TOKEN   # writes .vercel/project.json + env
VERCEL=1 pnpm dlx nx@$NX_VERSION run <app>:build                            # vercelPreset() emits .vercel/output
vercel deploy --prebuilt [--prod] --token=$VERCEL_TOKEN                      # uploads the prebuilt output
```

Rationale / trade-offs vs the two alternatives:

- **vs plain `vercel build`** (Vercel CLI runs the framework build itself): our
  build is an Nx target with the GCS remote cache + `affected`. Running the build
  through Nx (with `VERCEL=1` so `vercelPreset()` engages and writes the Build
  Output API dir `.vercel/output`) keeps cache reuse and avoids a second,
  un-cached build inside the CLI. `vercel build` is the **fallback** if the pilot
  (task 4) finds the preset only emits `.vercel/output` under the CLI and not
  under a bare Nx/Vite build — that's the one assumption this approach must verify.
- **vs `vercel deploy` from source** (no `--prebuilt`): would upload source and
  build on Vercel's builders — i.e. exactly the dashboard-build behavior we're
  moving away from; no in-repo control or Nx cache. Rejected.

`vercel pull` is still used (even with an Nx build) so `.vercel/project.json` and
the environment are present for `deploy --prebuilt` and so `vercelPreset()` has
project context.

## 2. Preview vs production

- **PR (non-`main`)** → preview: `vercel deploy --prebuilt` (no `--prod`). Surface
  the returned deployment URL as a **PR comment** (sticky, one per app) via a
  marker-keyed comment action; the CLI prints the URL to stdout → capture into a
  step output.
- **push to `main`** → production: `vercel deploy --prebuilt --prod`.
- Environment for `vercel pull` mirrors this (`--environment=preview` on PRs,
  `=production` on `main`).

## 3. Monorepo / multi-project — one workflow, affected matrix

**Decision:** a single `vercel-deploy.yml` with a **job matrix over affected
apps**, not per-app workflows (avoids 4× duplicated YAML).

- Reuse / extend **`.github/actions/nx-affected-docker-apps`** (already emits
  `matrix-json` = `{"include":[{"app":"..."}]}` from `nx show projects --affected`
  intersected with a configured list). Feed it the Vercel app list
  (`openthrottle-admin,openthrottle-email,openthrottle-website[,openthrottle-developer]`).
- A `compute-affected` job emits the matrix; a `deploy` job runs
  `strategy.matrix` over it. Empty include → no deploy jobs (nothing affected).
- Each matrix leg maps `app → VERCEL_PROJECT_ID` via a lookup (per-app GH
  secret/var named by convention, e.g. `VERCEL_PROJECT_ID_<APP>`).

## 4. Env-var strategy — keep in Vercel, pull at build

**Decision:** application env vars **stay in Vercel** (single source of truth) and
are fetched per deploy via `vercel pull`. **Only the deploy credentials** live in
GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and per-app `VERCEL_PROJECT_ID`.

Rationale: avoids duplicating (and drifting) every app env var into GitHub
secrets; `vercel pull` already delivers them into the prebuilt build; matches how
Vercel previews/prod resolve env today. (If a future need arises to build fully
offline, revisit — but that's not a v1 goal.)

## 5. `openthrottle-developer` end state — ⚠️ NEEDS USER CONFIRMATION

The developer app is currently **Vercel-disabled** (`git.deploymentEnabled:false`).
Two viable end states:

- **(A, recommended default)** Bring it onto the same GHA flow but keep it
  **preview-only** (deploy previews on PRs for review; no production target) until
  product explicitly wants it in prod. Low risk, gives the team preview URLs.
- **(B)** Leave it entirely out of the deploy matrix for now (status quo).

**Recommendation: (A)**, but flagged for the user — it's a product/ops call, not a
purely technical one. The pilot (task 4) uses `openthrottle-website` regardless,
so this decision only affects the task-7 rollout.

## 6. Rollback & double-deploy avoidance (cutover)

- **Avoid double-deploys**: per app, once GHA parity is confirmed (task 6), disable
  Vercel's Git auto-deploy — preferred mechanism is the app's `vercel.json`
  `git.deploymentEnabled:false` (already how `openthrottle-developer` is set), which
  is **in-repo and reviewable**, over a dashboard-only "Ignored Build Step". So
  cutover flips `admin`/`email`/`website` `vercel.json` to `false` in the same PR
  that proves the GHA deploy works.
- **Rollback**: revert that one-line `vercel.json` change (`deploymentEnabled:true`)
  to instantly restore Vercel's Git integration; the GHA workflow can be left in
  place (idempotent) or disabled via `workflow_dispatch`-only. Because the toggle is
  a committed file, rollback is a normal revert PR — no dashboard archaeology.
- **Ordering**: enable GHA deploy first (both run briefly in parallel during the
  proving PR), confirm parity, then flip `deploymentEnabled:false` — never the
  reverse, so there's never a window with no deploy path.

## Decisions summary

| Question         | Decision                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Mechanism        | `vercel pull` → Nx build (`VERCEL=1`) → `vercel deploy --prebuilt`; `vercel build` as fallback |
| Preview/prod     | PR = preview + sticky PR-comment URL; `main` = `--prod`                                        |
| Multi-app        | one workflow, affected matrix via `nx-affected-docker-apps`                                    |
| Env vars         | stay in Vercel (`vercel pull`); only TOKEN/ORG_ID/PROJECT_ID in GitHub                         |
| developer app    | **(A) preview-only — pending user confirmation**                                               |
| Cutover/rollback | flip `vercel.json` `git.deploymentEnabled` in-repo; rollback = revert                          |

## Carries into later tasks

- Task 3: provision `VERCEL_TOKEN` / `VERCEL_ORG_ID` / per-app `VERCEL_PROJECT_ID`
  (needs the dashboard inventory from task 1's checklist).
- Task 4: pilot `openthrottle-website`; **verify `vercelPreset()` emits
  `.vercel/output` under the Nx build** (the one open assumption above).
- Task 5: generalize to the affected matrix + reuse the GCS Nx remote cache.
- Task 6: cutover `website` (flip `vercel.json`), validate parity incl. the CSP
  header + custom domain.
