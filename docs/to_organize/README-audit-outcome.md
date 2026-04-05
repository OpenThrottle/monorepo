# Package README audit: outcome summary

Final deliverable for the **Audit package README.md for stale content** plan (Plan-Id: `0e7100f8-885a-4d19-bc19-4dca85e2ac3a`). Task: **Document audit outcome** (Task-Id: `9ac42e38-4017-4146-b3fd-e0fbabcfb73c`).

**Related docs:**

- [Stale definition and checklist](./README-audit-stale-definition-and-checklist.md) — what counts as stale and per-README checklist
- [Inventory and priority](./README-audit-inventory-and-priority.md) — 71 READMEs by scope and audit order
- [Audit results](./README-audit-results.md) — pass/fail/N/A and fix log

---

## 1. What was updated

All identified issues were fixed in-repo (no deferred items).

| Change                         | Scope                                           | Count / details                                                                                                                                |
| ------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Install order**              | Install-from-registry blocks in package READMEs | **60 READMEs** — reordered to **pnpm first**, then npm, then yarn. READMEs that already had pnpm first were left unchanged.                    |
| **Nx commands**                | mattscholta/ai-mcp, mattscholta/docs-mcp        | **2 READMEs** — replaced bare `nx build` / `nx run …` with `pnpm nx run <project>:<target>`.                                                   |
| **Workspace run instructions** | barguide/react-emails                           | **1 README** — "Getting Started" now uses `pnpm install` and `pnpm run dev` instead of npm/yarn. Installation section reordered to pnpm first. |

**Total READMEs touched:** 63 (60 install-order + 2 Nx + 1 barguide/react-emails; some overlap where a single README had multiple fixes).

---

## 2. What was deferred

**None.** Every failing checklist item from the audit was addressed with in-repo updates.

---

## 3. Recurring patterns

These patterns drove most of the audit findings and should guide future README edits.

| Pattern                             | Finding                                                                                                                                            | Fix applied                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Install order**                   | Most READMEs listed **npm** first in "Install" or "Install from registry" blocks. Workspace standard is **pnpm** (AGENTS.md, cursor-commands.mdc). | Reorder to pnpm first, then npm, then yarn (or two options only).           |
| **Nx commands**                     | A few READMEs showed bare `nx run …` or `nx build …` without the package manager.                                                                  | Use `pnpm nx run <project>:<target>` (or `pnpm exec nx …`) in all examples. |
| **Workspace run instructions**      | One README described cloning and running with only npm/yarn.                                                                                       | Use pnpm for repo-level commands (e.g. `pnpm install`, `pnpm run dev`).     |
| **Scripts / internal links / deps** | No broken scripts, internal links, or wrong package names were found.                                                                              | —                                                                           |

---

## 4. Repo-wide README guidelines (to add)

Recommended additions to repo documentation so new and updated package READMEs stay consistent.

### 4.1 Where to document

- **Option A:** Add a short **Package README guidelines** section to **AGENTS.md** (or **CLAUDE.md**) with a link to the full checklist.
- **Option B:** Create **docs/packages/README-guidelines.md** (or similar) and link to it from AGENTS.md and from `packages/README.md`.

### 4.2 Suggested guideline text

**Package READMEs (`packages/**/README.md`):\*\*

1. **Package manager**
   - For "Install from registry" (or equivalent), list **pnpm** first, then npm, then yarn. The monorepo uses pnpm; see AGENTS.md and `.cursor/rules/commands/cursor-commands.mdc`.
   - Any instructions for running or developing _inside this repo_ must use **pnpm** (e.g. `pnpm install`, `pnpm run dev`), not yarn or npm as the only option.

2. **Nx / task commands**
   - When showing Nx commands, use **`pnpm nx run <project>:<target>`** or **`pnpm exec nx run <project>:<target>`**. Do not use bare `nx` in README examples.

3. **Scripts and links**
   - Only mention scripts that exist in the package’s `package.json` or the root. Use current package names and paths; fix or remove broken internal links.

4. **Audit checklist**
   - For a full definition of "stale" and a per-README checklist, see [README-audit-stale-definition-and-checklist.md](./README-audit-stale-definition-and-checklist.md). Re-run the checklist when adding or heavily editing a package README.

### 4.3 Optional: automation

- **Lint / CI:** A simple check (e.g. in Nx or a markdown lint step) could flag READMEs that contain "yarn" or "npm install" in an "Install" or "Getting started" section without "pnpm" earlier in the same section. Not implemented in this plan; consider as a follow-up.

---

## 5. Summary

| Item                 | Result                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| READMEs in scope     | 71 (`packages/**/README.md`)                                                                                                                                                    |
| READMEs updated      | 63 (install order, Nx commands, workspace run instructions)                                                                                                                     |
| Deferred             | 0                                                                                                                                                                               |
| Recurring patterns   | Install order (pnpm first), Nx command form, workspace pnpm usage                                                                                                               |
| Repo-wide guidelines | Recommended: add to AGENTS.md or docs/packages/README-guidelines.md; link to [README-audit-stale-definition-and-checklist.md](./README-audit-stale-definition-and-checklist.md) |

This completes the **Document audit outcome** task for the package README audit plan.
