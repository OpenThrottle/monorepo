# Package README audit: definition of “stale” and checklist

This document defines what counts as **stale** for the **Audit package README.md for stale content** plan (Plan-Id: `0e7100f8-885a-4d19-bc19-4dca85e2ac3a`) and provides a short checklist for auditors. Scope: **71 READMEs** under `packages/**/README.md`.

---

## 1. Definition of “stale”

Content in a package README is **stale** when it would mislead someone following the README today—e.g. wrong commands, broken links, or outdated structure. Concretely:

| Category                      | Stale means …                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Package manager**           | README recommends or shows **yarn** or **npm** as the primary/only way to install or run things in this monorepo. The workspace uses **pnpm**; package-manager examples should use pnpm (or at least lead with pnpm). Listing npm/yarn/pnpm for _published_ packages is acceptable, but pnpm should be first. |
| **Nx / task commands**        | Examples use old or wrong Nx usage: e.g. `yarn nx build`, `nx build` without package manager prefix, deprecated flags, or wrong project names. Correct pattern: **`pnpm nx run <project>:<target>`** or **`pnpm exec nx run <project>:<target>`** (see AGENTS.md, cursor-commands.mdc).                       |
| **Scripts**                   | README mentions scripts (e.g. `build`, `test`, `lint`) that no longer exist in that package’s `package.json` or the root, or that have been renamed.                                                                                                                                                          |
| **Internal links**            | Links to other files or packages in the repo are broken: target was moved, renamed, or removed (e.g. wrong path, wrong package name, dead anchor).                                                                                                                                                            |
| **Package names / deps**      | README references package names that have been removed or renamed in the workspace, or wrong `@scope/package` names.                                                                                                                                                                                          |
| **Deprecated tooling / APIs** | README documents or links to deprecated tools, APIs, or features that are no longer supported or have been replaced.                                                                                                                                                                                          |
| **Workspace structure**       | README describes paths or layout that no longer match the repo (e.g. wrong apps/packages/applications layout, wrong Nx project names).                                                                                                                                                                        |

**Not stale (by default):**

- READMEs that list npm/yarn/pnpm for **install from registry** for a _publishable_ package, as long as pnpm is included and preferably first.
- High-level descriptions that are still accurate even if minimal.
- Links to external, stable docs that still resolve.

---

## 2. Auditor checklist (per README)

Use this list for each `packages/**/README.md`. Record **pass / fail / N/A** and note concrete issues (e.g. “says `yarn add` only”, “link to `@old/name`”, “script `foo` not in package.json”).

1. **Package manager**
   - [ ] Any install or run instructions use **pnpm** (or pnpm is the first/main option) for workspace usage.
   - [ ] No instruction that says “use yarn” or “use npm” as the only way to work in this repo.

2. **Nx / task commands**
   - [ ] If Nx is mentioned, examples use the correct form: `pnpm nx run <project>:<target>` (or `pnpm exec nx …`).
   - [ ] Project and target names match current `project.json` / Nx config (no renamed or removed projects).

3. **Scripts**
   - [ ] Every script mentioned in the README (e.g. `build`, `test`, `lint`) exists in the package’s `package.json` or the root one.

4. **Internal links**
   - [ ] All relative links (e.g. `./CONTRIBUTING.md`, `../../other-package`) resolve.
   - [ ] All internal package links (e.g. `@scope/other-pkg`) use current package names.

5. **Package names / deps**
   - [ ] No references to removed or renamed packages.
   - [ ] Mentioned `@scope/package` names match the workspace (e.g. `nx_workspace` or `package.json`).

6. **Deprecated tooling / APIs**
   - [ ] No references to deprecated tools or APIs without a note that they’re deprecated or replaced.

7. **Workspace structure**
   - [ ] Described paths and project/app names match the current repo layout (e.g. `applications/`, `packages/`, Nx project names).

---

## 3. How to record issues

For each README:

- **Pass:** Checklist item is satisfied; no change needed.
- **Fail:** Note the exact line or section and the fix (e.g. “Replace `yarn add` with `pnpm add`”, “Update link to `packages/new-name/README.md`”).
- **N/A:** Item doesn’t apply (e.g. README doesn’t mention Nx or scripts).

Prefer **in-repo updates** for stale content; if deferred, open a tracked issue or task with the concrete change items from this checklist.

---

## 4. References

- **AGENTS.md** — pnpm, Nx usage, workspace guidelines.
- **.cursor/rules/commands/cursor-commands.mdc** — “ALWAYS use PNPM”, “ALWAYS use NX”.
- **docs/tools/templates/AUDIT_CHECKLIST.md** — Similar checklist pattern for code/template audits.

This checklist supports task **Define 'stale' and checklist** (Task-Id: `fea3504f-82d8-49ec-a0c0-dbdd03642269`).
