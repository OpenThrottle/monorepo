# Repo skills discovery — design

Plan: **Dynamic repo skills registry from `.agents/skills` and `.cursor/skills`** (`fca6f044-fcb2-48f9-8ff5-1e32a76773c3`).

## Problem

`REPO_SKILLS_REGISTRY` in `app/routing/agents/data/repo-skills-registry.ts` is hand-maintained and drifts from on-disk skills (e.g. missing `openthrottle-generators`, `ot-plans`, `workflow-ralph`, `openthrottle-stack`).

## Goals

- Skills list and layout counts reflect the filesystem without editing TypeScript when skills are added.
- Safe behavior when the monorepo checkout is not available (deployed developer app).

## Monorepo root resolution

**Environment variable:** `WORKSPACE_ROOT` (same name as `openthrottle-server`, plans/workflow processors, and `database-backup`). Do not introduce a second variable (e.g. `MONOREPO_ROOT`).

**Resolution order** (implemented in `resolve-monorepo-root.server.ts`):

1. If `WORKSPACE_ROOT` is set (trimmed, non-empty) and is an existing directory → use it.
2. Otherwise walk upward from `process.cwd()`, at most 12 levels, stopping at the filesystem root. The first directory that contains **both** `nx.json` and `pnpm-workspace.yaml` is the monorepo root.
3. If no root is found → return `null` (do not throw).

**Why walk-up:** Nx/Vite often run with `process.cwd()` at `applications/openthrottle-developer` while skills live at the repo root. `WORKSPACE_ROOT` alone matches server behavior but is easy to omit locally; walk-up fixes dev without requiring env for every developer.

**Validation:** The resolved path must be a directory. Invalid `WORKSPACE_ROOT` values are ignored (fall through to walk-up, then `null`).

## Discovery timing

- Run **once per request** in the `skills._index` route **loader** (SSR), not in the client bundle.
- No in-memory cache in v1 (~25 `SKILL.md` files; cost is negligible).
- Loader returns serializable `entries: RepoSkillEntry[]` for components; optional `monorepoRoot: string | null` for debug/settings only.

## Server-only boundary

React Router replaces `*.server.ts` modules with empty stubs in the **client** build. Filesystem discovery must live only in:

- `resolve-monorepo-root.server.ts`
- `discover-repo-skills.server.ts` (scanner)
- `parse-skill-frontmatter.server.ts` (`name` / `description` from `---` blocks)

**Allowed imports:**

| Module                                          | May import                               |
| ----------------------------------------------- | ---------------------------------------- |
| `skills._index.tsx` loader                      | `*.server.ts` discovery                  |
| `skills._index.tsx` component                   | `loaderData` only — **no** `*.server.ts` |
| Presentational components (`SkillsTable`, etc.) | `RepoSkillEntry` type + props            |

**Forbidden:** Importing `node:fs` or discovery helpers from route components, hooks, or shared UI modules.

## Scanner behavior (production / Docker / Vercel)

When `getMonorepoRoot()` returns `null`, or when skill directories are missing under a valid root:

- Return **`entries: []`** (empty array).
- **Do not** throw or return HTTP 5xx from the loader.
- `getRepoSkillsRegistryCounts([])` → `{ agents: 0, cursor: 0 }`.

Missing **individual** paths is normal:

- `.agents/skills` absent → zero agents entries; still scan `.cursor/skills` if present.
- `.cursor/skills` absent → zero cursor entries.
- Neither directory exists → empty list.

**Deployed environments:** Vercel/production builds typically do not mount the full OpenThrottle monorepo. Expect an empty Skills table unless `WORKSPACE_ROOT` points at a checkout (or volume) that includes `.agents/skills` and `.cursor/skills`. Document in developer app README and `.env.default`.

**Errors:** Only unexpected I/O failures (e.g. permission denied reading a readable path) may be logged server-side; still prefer returning partial/empty `entries` rather than failing the page.

## On-disk layout (scanner — next tasks)

| Layout   | Directory under repo root        |
| -------- | -------------------------------- |
| `agents` | `.agents/skills/<slug>/SKILL.md` |
| `cursor` | `.cursor/skills/<slug>/SKILL.md` |

Each entry: `layout`, `repoRelativePath`, `slug` (frontmatter `name` or folder name), `summary` (frontmatter `description`, trimmed; placeholder if missing). Sort by `layout` then `slug`.

## Types and static helpers

Keep in `repo-skills-registry.ts` (no filesystem):

- `RepoSkillEntry`, `SkillRegistryLayout`
- `getRepoSkillsRegistryCounts`

Remove `REPO_SKILLS_REGISTRY` when wiring the loader (separate task).

## Env and docs

- Commented `WORKSPACE_ROOT` in `applications/openthrottle-developer/.env.default`.
- Skills discovery requirements: `applications/openthrottle-developer/README.md` (§ Skills page).

## Manual verification targets

With monorepo root resolved, on-disk counts should match:

- `.agents/skills`: **18** `SKILL.md` files
- `.cursor/skills`: **7** `SKILL.md` files

Includes skills missing from the old static array (e.g. `openthrottle-generators`, `ot-plans`, `workflow-ralph`, `openthrottle-stack`).

## Related code

- UI route: `app/routes/skills._index.tsx`
- Server paths for workspace editor apply: `packages/nestjs-repositories/.../openthrottle-repo-skill-paths.ts` (separate follow-up to derive from discovery or shared source)
