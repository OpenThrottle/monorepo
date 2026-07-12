# Agent skills pipeline — audit findings

> Audited 2026-07-11 against `main` (`3884c2de`). Companion docs:
> [agent-assets-canonical-layout.md](./agent-assets-canonical-layout.md) (layout + SSOT rules),
> [agent-editor-folders.md](./agent-editor-folders.md) (editor folder strategy),
> [agent-assets-frontmatter-schemas.md](./agent-assets-frontmatter-schemas.md) (schema reference).
>
> This doc records how the skills pipeline works end-to-end **today** and the gaps that motivate
> OT plan `9a58dbe9-9cdb-4269-bfa0-108381965519` (context-aware skill availability).

## The pipeline at a glance

```
.agents/skills/<slug>/SKILL.md            SSOT bodies (46 skills)
  │  per-entry symlinks / byte-copies
  ├── .cursor/skills/<slug>  ─┐
  ├── .claude/skills/<slug>   ├─ symlinks → ../../.agents/skills/<slug>
  ├── skills/<slug>          ─┘
  └── .opencode/skills/<slug>    byte-identical copies (partial set, 9 skills)
         │
         ▼  guarded by
scripts/check-agent-assets-ssot.sh        (pnpm nx run monorepo:check-agent-assets-ssot)
         │
         ▼  parsed + validated by
@openthrottle/openthrottle-skills         parse-skill-frontmatter.ts
                                          schemas/agent-asset-frontmatter.schemas.ts (.strict())
         │
         ▼  discovered by (developer app)
applications/openthrottle-developer/app/routing/agents/data/
  discover-repo-skills.server.ts + repo-skills-registry.ts
         │
         ▼  synced by (backend, parallel path)
packages/nestjs-repositories/src/modules/workspace-settings/
  openthrottle-repo-skill-paths.ts (hardcoded 25-entry list)
  workspace-editor-config.service.ts → writes .openthrottle/workspace-editors.json
```

## 1. SSOT and mirrors

- `.agents/skills/` holds **46 skill directories**, each with a `SKILL.md`. Sibling SSOT trees:
  `hooks/`, `learnings/`, `personas/`, `prompts/`, `rules/`. Assets are markdown + frontmatter
  only — there are **no JSON/YAML config files** under `.agents/`.
- `.cursor/skills/`, `.claude/skills/`, and root `skills/` are **per-entry relative symlinks**
  into `.agents/skills/` (the parent directory itself is a real directory; each child is a link).
- `.opencode/skills/` is a **partial copy mirror** (9 skills), required to stay byte-identical
  (`cmp -s`) with its `.agents` counterparts.
- `scripts/check-agent-assets-ssot.sh` (CI: `pnpm nx run monorepo:check-agent-assets-ssot`)
  enforces all of the above: mirror entries must be unbroken symlinks targeting
  `.agents/skills/<name>`, SSOT bodies must be regular files (not symlinks), `.cursor/rules`
  `.mdc` files must be symlinks, and `.opencode` copies must be byte-identical.

## 2. Frontmatter: parse + validate

Package: `packages/openthrottle-skills`.

- `src/parse-skill-frontmatter.ts` — `parseSkillFrontmatter(fileContent)` returns
  `ParsedSkillFrontmatter { name; description; disableModelInvocation }`, mapping the YAML key
  `disable-model-invocation` → `disableModelInvocation: boolean | undefined`. A companion
  `parseSkillFrontmatterForValidation` returns raw kebab-case fields for Zod.
- `src/schemas/agent-asset-frontmatter.schemas.ts` — `skillFrontmatterSchema` is **`.strict()`**
  and models exactly three fields: `description` (required), `name` (kebab-case slug pattern),
  `disable-model-invocation` (`z.boolean().optional()`). There is **no `tags` or
  `allowed-tools` field** in the skill schema today.
- `src/frontmatter/parse-yaml-frontmatter.ts` — a **hand-rolled minimal YAML parser** (not the
  `yaml` package). It handles scalars, quoted strings, and block scalars, and coerces
  `true`/`false` to booleans — but **does not support lists/flow collections**. Its own
  docstring recommends migrating to the `yaml` package before extending it (which the plan's
  tag work requires).

### Baseline `disable-model-invocation` inventory (verified 2026-07-11)

| value   | count | slugs                                                                                                                                                                                                                                                                                                     |
| ------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `true`  | 18    | agents-code-review, github-branch, github-commit, github-create-issue, github-my-pull-requests, github-pull-request, github-squash, github-summarize, github-untracked, github-worktree, grill-me, ot-ask, ot-create-plan, ot-edit-task, ot-list-by-status, ot-list-sources, ot-pending, ot-planning-mode |
| `false` | 1     | agents-ralph                                                                                                                                                                                                                                                                                              |
| unset   | 27    | the remaining skills (unset behaves as model-invocable)                                                                                                                                                                                                                                                   |

> Earlier plan notes said "19 true / 26 unset"; grep of the SSOT gives **18 / 1 / 27** of 46.

Semantics: `disable-model-invocation: true` suppresses **automatic (model-initiated)**
invocation only. A human can always run `/<skill>` explicitly. That behavior is honored by the
downstream agent runtime (Cursor / Claude Code) reading frontmatter off disk — OpenThrottle
ships the value but nothing in OT reads or enforces it (see gaps).

## 3. Discovery (developer app)

Files: `applications/openthrottle-developer/app/routing/agents/data/`.

- `discover-repo-skills.server.ts` scans four layouts (`.agents`, `.claude`, `.cursor`,
  `.opencode`), reads each `SKILL.md`, and calls `parseSkillFrontmatter` — using `name` for the
  slug and `description` for the summary. **`disableModelInvocation` is parsed and then
  discarded.**
- `repo-skills-registry.ts` defines `RepoSkillEntry { layout; repoRelativePath; slug; summary }`
  — no invocation flag — plus `dedupeRepoSkillEntriesBySlug` (prefers the `agents` layout) and
  `REQUIRED_AGENTS_SKILL_SLUGS` (a precedent for "always-present" skill sets).
- Consumers: the `skills._index.tsx` loader (Skills table UI), `personas._index.tsx`
  (parallel persona discovery), and the agent-search disk fallback. The Skills UI shows
  Owner/Summary/Actions columns — **no column surfaces the invocation flag**.

## 4. Backend workspace-settings sync (parallel path)

Files: `packages/nestjs-repositories/src/modules/workspace-settings/`.

- `openthrottle-repo-skill-paths.ts` exports `OPENTHROTTLE_REPO_SKILL_PATHS`, a **hardcoded,
  manually maintained list of 25 entries** (18 `agents`-layout + 7 `cursor`-layout), each
  `{ layout; repoRelativePath; slug }`. `RepoSkillPathLayout` is `'agents' | 'cursor'` —
  narrower than discovery's four-layout enum.
- `workspace-editor-config.service.ts` (`WorkspaceEditorConfigService.applyForUser`) iterates a
  user's repos × enabled editors (`WorkspaceEditorId = 'cursor' | 'vscode'`; vscode maps to the
  `agents` layout), filters the hardcoded list by layout, creates skill parent directories, and
  writes a manifest to **`.openthrottle/workspace-editors.json`** with
  `{ appliedAt, editor, enabledSkillPaths, mcpConfigPath, rulesDirectory }`.
- Settings entity: `user_workspace_settings` is **user-scoped** (`user_id` PK,
  `enabled_editors` JSONB). No repo- or context-scoped configuration exists anywhere.

## 5. Gaps (what the plan fixes)

1. **The flag is parsed, then dropped.** `parseSkillFrontmatter` produces
   `disableModelInvocation`, but `RepoSkillEntry` doesn't carry it — the value dies at the
   discovery boundary. No UI displays it.
2. **No runtime consumer in OT.** Nothing server-side or app-side reads the flag to gate,
   display, or reason about invocation. Enforcement today is entirely the downstream editor
   runtime's reading of raw frontmatter.
3. **`OPENTHROTTLE_REPO_SKILL_PATHS` is a parallel, drifting availability mechanism.** It is a
   hand-maintained subset (25 of 46 skills) that overlaps the plan's goal, and it has already
   drifted: its `my-pull-requests` entry points at
   `.agents/skills/my-pull-requests/SKILL.md`, **which does not exist** (the real slug is
   `github-my-pull-requests`). Layout enums also disagree across the stack
   (`agents|claude|cursor|opencode` in discovery vs `agents|cursor` in the backend vs
   `cursor|vscode` for editors).
4. **No context-scoped config home.** `user_workspace_settings` is user-scoped only; there is
   no per-repo/per-project or per-environment place to hang availability rules — the gap the
   plan's per-project rules + per-workspace vocabulary tables fill.

## Where this goes next

OT plan `9a58dbe9-9cdb-4269-bfa0-108381965519` builds context-aware availability on these
findings: controlled tags in frontmatter (after migrating the parser to the `yaml` package), a
per-workspace tag vocabulary and per-project rules in the OT database, a pure
`resolveSkillAvailability` resolver in `@openthrottle/openthrottle-skills`, and a GraphQL/MCP
effective-availability surface. v1 is informational; enforcement via the workspace-settings
sync path is backlog. The canonical decision record is
[skill-availability-design.md](./skill-availability-design.md).
