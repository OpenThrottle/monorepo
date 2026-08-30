# Repo skills discovery — design

Plan: **Dynamic repo skills registry from `.agents/skills`** (`fca6f044-fcb2-48f9-8ff5-1e32a76773c3`).

> **Updated 2026-07-20:** the dedicated `.cursor/skills` _fan-out_ was retired. OpenThrottle standardizes on `.agents/skills` — the SSOT view combining authored `skills/` and lockfile-installed external skills — with `.claude/skills` as generated fan-out (deduped in, preferring `.agents`). See [docs/Skills.md](../../../docs/Skills.md) and [skills/ot-skill-sync/SKILL.md](../../../skills/ot-skill-sync/SKILL.md).
>
> **Updated 2026-08-13:** the _scan_ re-added per-CLI read dirs. Because Cursor 2.4+, Codex, and Grok Build read the `SKILL.md` standard, `discoverRepoSkills` now scans `.agents/skills`, `.claude/skills`, `.codex/skills`, `.cursor/skills`, `.grok/skills`, and `.opencode/skills` (all deduped by slug, still preferring `.agents`). This is a read-only discovery change and does **not** reinstate a `.cursor/skills` fan-out. The cursor-specific figures in the tables below are historical illustration, not the current layout set.

## Problem

`REPO_SKILLS_REGISTRY` in `app/routing/agents/data/repo-skills-registry.ts` is hand-maintained and drifts from on-disk skills (e.g. missing `ot-generators`, `ot-plans`, `workflow-ralph`, `ot-stack`).

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
- `getRepoSkillsRegistryCounts([])` → `{ agents: 0 }`.

Missing **individual** paths is normal:

- `.agents/skills` absent → zero entries; the `.claude/skills` fan-out is still scanned if present.
- No skill directories exist → empty list.

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

Includes skills missing from the old static array (e.g. `ot-generators`, `ot-plans`, `workflow-ralph`, `ot-stack`).

## Source (provenance) — derived, never frontmatter

Plans: **Skills detail route + source classification**
(`6c785a74-fd94-474f-8e1b-0e182bd5c0b0`) and **Fully-virtual skill
provenance** (`9dc16a01-ddff-44d6-984f-41b119938379`).

Provenance is **derived from the ot-skill-sync architecture** — installed skills
are installed, that's it; every layer on top of them is virtual:

| Layout signal (realpath of the skill folder)      | Provenance                                      |
| ------------------------------------------------- | ----------------------------------------------- |
| Resolves under `<root>/skills/` (authored SSOT)   | `openthrottle` — written and PR-reviewed here   |
| Anything else (lockfile-installed real directory) | `external`, `sourceUrl` from `skills-lock.json` |

**Rules:**

- The enum is `openthrottle | external` (`SKILL_SOURCES` in
  `@openthrottle/openthrottle-skills`), but it is **not a frontmatter key** —
  `parseSkillFrontmatter` and `skillFrontmatterSchema` know nothing about it,
  and a stray `source:` key in a SKILL.md is an ignored unknown.
- The realpath rule works identically for every scanned layout
  (`.agents/skills`, `.claude/skills`, `.cursor/skills`) because the generated
  symlink chains all resolve to the authored directory.
- `sourceUrl` comes from the repo-root `skills-lock.json` entry for the folder
  name (`github` shorthand `owner/repo` → `https://github.com/owner/repo`;
  full-URL sources pass through; missing/invalid lockfile ⇒ no URL).

**Flow:** layout + lockfile derivation → `RepoSkillEntry.source`/`sourceUrl` →
merged with the ingested `projectSkills` GraphQL row (a recognized ingested
value overlays the disk value; the empty-GraphQL silent fallback is unchanged)
→ Source badge column + All/OpenThrottle/External toolbar filter on the index.
Postgres persists the derived value on `project_skills.source` (+ nullable
`source_url`, migration 074); the ingest path derives it the same way via the
walker's `authored` flag + `parseSkillsLockFile`.

## External skills are read-only (the personal tier is not)

Provenance gates writes, not just display. An in-app edit of an **external**
SKILL.md would silently fork it from upstream: the next `ot-skill-sync` / lockfile
install either clobbers the edit or leaves the repo permanently diverged. Two
kinds of skill are editable here: `openthrottle`-sourced ones — real directories
under the authored `skills/` tree — and the **personal tier** (`isPersonal`),
which is the author's own private directory linked into the repo and has no
upstream to diverge from. Only a lockfile-installed external skill is read-only.

- **Enforcement point:** `writeSkillFileBySlug`
  (`app/routing/skills/data/write-skill-file.server.ts`) refuses when the
  freshly discovered entry is neither `source === 'openthrottle'` nor
  `isPersonal === true`. Provenance is read from disk-derived discovery, never
  from client input (and never from a frontmatter `source:` key), and the check
  runs before frontmatter validation and before any write.
- **Personal writes go through the symlink.** The target is still
  `join(monorepoRoot, entry.repoRelativePath)` — the gitignored
  `.agents/skills/<slug>` link — so `writeFileSync` follows it into the file
  under the personal root. The link itself is never unlinked or replaced with a
  real file: that would break `ot-skill-sync` and risk staging a personal skill.
- **UI:** `useSkillDetail` derives `canEdit = editable && isEditableProvenance`
  (authored or personal) and the matching disabled reason. The external tooltip
  wins over the missing-checkout one (it is the more specific blocker), and
  `handleEdit` no-ops when the gate is closed, so edit mode is unreachable. The
  UI gate is a courtesy — the server helper refuses regardless of what the
  client posts.
- **Still editable for external skills:** record-level tags
  (`project_skills.tags`), orphan removal, and skill-availability rules. Those
  are database rows, not SKILL.md content, so they cannot drift from upstream.
  Running an external skill is likewise unaffected.

- **Exactly one write path for SKILL.md.** The custom-prompt resolver
  (`applications/openthrottle-server/src/graphql/prompts/custom-prompts.resolver.ts`)
  can also persist content to a client-supplied `filePath`, which would have
  been a way around this gate. It now refuses any `SKILL.md` target outright
  (`resolveCustomPromptWritePath`, alongside its workspace-containment checks),
  so skill content is only ever written through `writeSkillFileBySlug` — the one
  path that enforces provenance and re-validates frontmatter.

To change a lockfile-installed external skill, change it upstream and re-sync.

## Detail route (`/skills/:slug`) — read and update

- **Loader** (`read-skill-file.server.ts`): resolve root → re-run discovery →
  find entry by slug → read the raw SKILL.md. Unknown slug or null root ⇒ 404
  `Response` via the route ErrorBoundary. Returns `{ entry, content, editable }`
  with `editable = monorepoRoot !== null`. A personal skill reads exactly like
  an authored one — the in-repo symlink is followed to the file under the
  personal root, with no second lookup by slug.
- **Read mode:** the whole file renders with `MarkdownRenderer` under a header
  (slug, Source badge with origin link, model-invocation badge, tags,
  repo-relative path + copy).
- **Edit mode:** `Editor` (Monaco, `@openthrottle/react-router-editor`,
  single-document surface) bound to the raw file; dirty tracking gates Save;
  Cancel reverts to the loaded content. `editable === false` (deployed app)
  shows a disabled Edit affordance with an explanatory tooltip — as does a
  lockfile-installed external skill, with its own tooltip (see "External skills
  are read-only (the personal tier is not)"). A personal skill edits like an
  authored one.
- **Write-back** (`write-skill-file.server.ts`, invoked by the route action):
  - The absolute target derives **only** from the discovered entry's
    `repoRelativePath` under the resolved root — never from client input.
  - A shared realpath allowlist
    (`app/routing/agents/data/skill-path-allowlist.server.ts`) admits a resolved
    path only under the monorepo root **or** under
    `resolvePersonalSkillsRoot()` from `@openthrottle/openthrottle-agentic-utils`
    (honouring `OPENTHROTTLE_PERSONAL_SKILLS_DIR`). Symlinked `.claude`/`.cursor`
    layouts resolve in-repo first; a rogue link into any other directory, a
    dangling link, or an unresolvable path is refused. The same allowlist backs
    the loader, and the same personal-root membership test decides discovery's
    `isPersonal` — escaping the repo is not by itself personal.
  - An entry that is neither `openthrottle` nor `isPersonal` is refused
    outright (see "External skills are read-only (the personal tier is not)").
  - The new content's frontmatter is re-validated with
    `validateAgentAssetFrontmatter` (must parse, keep `name`, match the slug,
    and satisfy the schema) **before** anything
    touches disk; rejections return structured errors without writing.
  - On success the whole file is written (`writeFileSync`, utf8) and loader
    revalidation returns the UI to read mode with the fresh render.

**Re-ingest expectation:** saving does **not** refresh the server-side
`projectSkills` / `skillAvailability` rows. Those update on the next
agent-asset ingest run (e.g. `database:import` / the ingest script). The disk
is the source of the entry list, so the detail and index pages reflect a save
immediately; only the ingested overlay lags until the next ingest.

## Related code

- UI routes: `app/routes/skills._index.tsx`, `app/routes/skills.$slug.tsx`
- Detail data: `app/routing/skills/data/{read,write}-skill-file.server.ts`
- Server paths for workspace editor apply: `packages/nestjs-repositories/.../openthrottle-repo-skill-paths.ts` (separate follow-up to derive from discovery or shared source)
