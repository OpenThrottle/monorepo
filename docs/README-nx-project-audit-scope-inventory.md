# Nx project README audit: scope and inventory

Supporting document for **Audit NX project README.md files for placeholders and stale content** (Plan-Id: `e3d59071-5223-47b0-ad25-95140a17db8b`). Task: **README: scope & inventory (workspace + Nx)** (Task-Id: `4005ca9b-d8f3-49e3-a42b-2fff5a34a70e`).

**Related:** [Stale definition and checklist](./README-audit-stale-definition-and-checklist.md) · [Prior package README audit outcome](./README-audit-outcome.md)

---

## 1. Scope: pnpm workspace vs Nx

### 1.1 `pnpm-workspace.yaml`

Included workspace roots:

- `applications/**/*`
- `infra/`
- `packages/**/*`
- `tools/*` (only **direct** children of `tools/` that define a `package.json`)

Explicit **exclusions** (not installable workspace packages):

| Pattern                         | Purpose                                        |
| ------------------------------- | ---------------------------------------------- |
| `!applications/barguide-llm/`   | Python/LLM app; kept out of the pnpm workspace |
| `!learning/` · `!learning/**/*` | Optional / non-workspace tree                  |
| `!packages/*/dist/**/*`         | Build output                                   |
| `!services/**/*`                | Not part of the workspace globs                |

### 1.2 Alignment check

| Check                                                      | Result                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm m ls -r --depth -1` (workspace packages with a path) | **101**                                                                        |
| `NX_ISOLATE_PLUGINS=false pnpm nx show projects`           | **101**                                                                        |
| Nx project `root` vs workspace package path                | **0** mismatches (every workspace package maps to exactly one Nx project root) |

Verification used the Nx project graph (`pnpm nx graph --file=…`) and compared each node’s `data.root` to `pnpm m ls` paths.

---

## 2. README presence at Nx project roots

For each of the **101** Nx projects, `README.md` exists at `{projectRoot}/README.md` (same path as each project’s `root` in the graph).

| Metric                           | Count |
| -------------------------------- | ----: |
| Nx projects                      |   101 |
| With `README.md` at project root |   101 |
| Missing                          | **0** |

**Add vs defer:** No README was added in this task. There are **no gaps** among Nx-owned project roots, so nothing was deferred for a later “add README” pass for this scope.

---

## 3. Out-of-scope paths (not Nx workspace packages)

These are **not** in the 101 Nx projects / `pnpm m ls` set but are called out in the plan:

| Path                         | In pnpm workspace?                                        | README | Notes                                                                  |
| ---------------------------- | --------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `applications/barguide-llm/` | No (excluded)                                             | Yes    | Audit content separately if needed; not in unified Nx list             |
| `learning/`                  | Excluded                                                  | N/A    | Directory not present in this clone                                    |
| `services/**`                | Excluded                                                  | Varies | Not a workspace glob; treat as out of scope for this Nx audit          |
| `tools/caddy/`               | No (not a package; no `package.json` under `tools/caddy`) | Yes    | Documented as tooling; not an Nx project                               |
| `tools/ai-migrations/`       | No                                                        | No     | No README; **deferred** unless this folder becomes a workspace package |

---

## 4. Task list mapping (remaining audit passes)

Rough counts of Nx projects by area (for follow-on tasks; totals sum to 101 with overlap only where a project fits one bucket):

| Area                         | Nx projects (by root prefix) |
| ---------------------------- | ---------------------------: |
| `applications/**`            |                           20 |
| `infra`                      |                            1 |
| `packages/barguide/**`       |                           14 |
| `packages/intouch/**`        |                            3 |
| `packages/mattscholta/**`    |                           28 |
| `packages/openthrottle/**`   |                           15 |
| `packages/rocketcms/**`      |                            8 |
| `packages/visormatt/**`      |                            5 |
| `tools/*` workspace packages |                            6 |
| Root / meta (`monorepo`)     |                            1 |

_(Exact lists can be regenerated with `pnpm nx show projects` and filtering by `root` prefix; sums to **101**.)_

---

## 5. Regeneration

```bash
# Workspace package count (should match Nx project count)
pnpm m ls -r --depth -1 --json

# All Nx project names
NX_ISOLATE_PLUGINS=false pnpm nx show projects

# Project roots (after exporting the graph)
NX_ISOLATE_PLUGINS=false pnpm nx graph --file=/tmp/nx-graph.json
```

Then confirm each `graph.nodes[*].data.root` has a `README.md`.
