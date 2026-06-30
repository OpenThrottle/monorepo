# Vercel deployment baseline (task 1)

**Plan:** OT `fc12183a-aab4-48a2-a7a8-4ae0680dab1c` — _Move Vercel build/deploy into a GitHub Actions workflow_.

Captures exactly how the React Router (v7 + Vite) apps deploy today so the
GitHub Actions flow (tasks 2–8) can reproduce it. The **repo-side** facts below
are verified from the source tree at this commit. The **dashboard-side**
inventory can only come from the Vercel dashboard/API and is left as a fill-in
checklist (requires `VERCEL_TOKEN` / dashboard access).

## Apps & current deploy trigger (repo-verified)

| App                      | `vercel.json` `git.deploymentEnabled` | Notes                                                                                                                         |
| ------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `openthrottle-developer` | **false** (disabled)                  | end state to confirm in task 2                                                                                                |
| `openthrottle-admin`     | true                                  |                                                                                                                               |
| `openthrottle-email`     | true                                  |                                                                                                                               |
| `openthrottle-website`   | true                                  | also sets a `Content-Security-Policy` response header via `vercel.json` `headers` — must be preserved/recreated after cutover |

Deploy is triggered today by **Vercel's dashboard Git integration** (Vercel
watches the repo and builds/deploys itself). There is **no** `VERCEL_TOKEN` /
`VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` and **no** Vercel CLI usage anywhere in the
repo.

## Vercel integration in code (repo-verified)

- Each app's `react-router.config.ts` is identical in shape: applies
  `vercelPreset()` from `@vercel/react-router/vite` **only when
  `process.env.VERCEL === '1'`**; otherwise `presets: []`. `ssr: true`, plus the
  v8 future flags. So the GHA flow must export `VERCEL=1` for the preset to
  engage (the Vercel CLI's `vercel build` sets this automatically).
- `.env.default` sets `VERCEL="0"` (local/default = preset off).
- Root `package.json`: depends on `@vercel/analytics` and `@vercel/react-router`
  (both `catalog:`); has a `clean:vercel` script (`rimraf --glob **/.vercel`).

## Build & output (repo-verified)

- Per-app Nx `build` target → output under `build/` (`build/client/`,
  `build/server/index.js`); served by `react-router-serve ./build/server/index.js`.
- `Dockerfile.ReactRouter` is the canonical reference for the full
  `pnpm nx run <app>:build` pipeline (multi-stage; `NODE_ENV=production`,
  `NX_DAEMON=false`).

## Existing CI building blocks to reuse (repo-verified)

These already exist and the deploy workflow should reuse them rather than
reinvent:

- **`.github/actions/node-setup`** — `actions/setup-node` from `.nvmrc` (Node 24),
  Corepack `pnpm@11.6.0`, pnpm **store** cache (not `node_modules`), GitHub
  Packages auth, `pnpm install --frozen-lockfile`, and an Nx local-cache
  `actions/cache` step.
- **Nx remote cache (GCS)** — `.github/workflows/continuous-integration.yml` runs
  on `blacksmith-4vcpu-ubuntu-2204` and wires `NX_GCS_BUCKET`
  (`openthrottle-staging-nx-cache`), `GOOGLE_CREDENTIALS` (via the
  `./.github/actions/google-cloud` auth step), `NX_KEY` (`vars.NX_KEY`),
  `NX_VERSION` (`vars.NX_VERSION`). It edits `nx.json`'s bucket via `sed` for the
  two-bucket CREEP-safe model (CVE-2025-36852).
- **`nx affected`** — CI already uses `pnpm dlx nx@$NX_VERSION affected --target=...`.
- **`.github/actions/nx-affected-docker-apps`** — composite action that intersects
  `nx show projects --affected` with a configured app list and emits
  `matrix-json` (`{"include":[{"app":"..."}]}`) + per-app boolean outputs. This is
  the **direct precedent for the affected-aware deploy matrix** in task 5 — extend
  or mirror it for the Vercel apps rather than writing new affected logic.

## ⛔ Dashboard-side inventory — REQUIRES VERCEL ACCESS (fill in before tasks 3/6)

I cannot read these from the repo; they must be pulled from the Vercel dashboard
or `vercel` CLI (`vercel project ls`, `vercel pull`). Capture per project
(`openthrottle-admin`, `openthrottle-email`, `openthrottle-website`,
`openthrottle-developer`):

- [ ] Vercel **project name + Project ID** (`VERCEL_PROJECT_ID`)
- [ ] **Org/Team ID** (`VERCEL_ORG_ID`, shared across the projects)
- [ ] Production branch (expected `main`)
- [ ] Install / Build / Output Directory settings + Framework Preset (confirm they
      match the Nx `build` → `build/` output above, or are overridden in the
      dashboard)
- [ ] Root Directory setting (monorepo: which subdir each project points at)
- [ ] Any existing **Ignored Build Step**
- [ ] **Environment Variables** per environment (production / preview /
      development) — list names, mark which are secrets that must move to GitHub
      secrets vs. stay in Vercel (pulled via `vercel pull`)
- [ ] **Custom domains** and which project/environment serves each
- [ ] Confirm what build output Vercel currently expects from `vercelPreset()`
      (`.vercel/output`) so `vercel build` parity is verified in task 4

## Open questions carried into task 2 (design)

- Intended end state for `openthrottle-developer` (currently Vercel-disabled).
- Env-var strategy: keep in Vercel (pulled via `vercel pull`) vs. move to GitHub
  secrets.
- Preview-URL surfacing (PR comment), custom-domain handling, double-deploy
  avoidance during cutover.
