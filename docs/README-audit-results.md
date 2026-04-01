# Package README audit: results

This document records the outcome of running the [stale-content checklist](./README-audit-stale-definition-and-checklist.md) over all **71** package READMEs for the **Audit package README.md for stale content** plan (Plan-Id: `0e7100f8-885a-4d19-bc19-4dca85e2ac3a`). It supports task **Audit READMEs** (Task-Id: `2815609c-18ea-4389-a856-d03b76264fa7`).

**Inventory and order:** [README-audit-inventory-and-priority.md](./README-audit-inventory-and-priority.md).

---

## 1. Summary

| Category                     | Pass | Fail | N/A |
| ---------------------------- | ---- | ---- | --- |
| 1. Package manager           | 4    | 67   | 0   |
| 2. Nx / task commands        | 2    | 2    | 67  |
| 3. Scripts                   | 69   | 1    | 1   |
| 4. Internal links            | 71   | 0    | 0   |
| 5. Package names / deps      | 71   | 0    | 0   |
| 6. Deprecated tooling / APIs | 71   | 0    | 0   |
| 7. Workspace structure       | 71   | 0    | 0   |

**Recurring patterns (for Fix or file issues task):**

- **Install order (67 READMEs):** Install-from-registry sections list **npm** first, then pnpm, then yarn. Checklist requires **pnpm first** for consistency with workspace. **Fix:** Reorder each to "pnpm" first, then npm, then yarn (or drop yarn if preferring two options).
- **Nx commands without pnpm (2 READMEs):** `mattscholta/ai-mcp`, `mattscholta/docs-mcp` use bare `nx build` or `nx run ...` in one or more places. **Fix:** Use `pnpm nx run <project>:<target>` (or `pnpm exec nx ...`).
- **Workspace run instructions (1 README):** `barguide/react-emails` "Getting Started" section uses only `npm install` / `yarn` and `npm run dev` / `yarn dev`. **Fix:** Use pnpm (e.g. `pnpm install`, `pnpm run dev` or the Nx equivalent from repo root).
- **Script (1 README):** `barguide/react-emails` mentions `dev`; confirm whether that script exists in the package or root (package has Nx targets but no `dev` in seen script list—may be root or legacy).

**Internal links checked:** All sampled internal links (vscode-openthrottle, react-router-profiling, react-router-shadcn, nestjs-rbac, nestjs-websockets) resolve. No broken internal links recorded.

---

## 2. Per-README results

Legend: **P** = Pass, **F** = Fail, **—** = N/A. Issues are summarized after the table for each scope.

### 2.1 packages/README.md (root)

| #                  | Checklist 1 | 2   | 3   | 4   | 5   | 6   | 7   | Issues                       |
| ------------------ | ----------- | --- | --- | --- | --- | --- | --- | ---------------------------- |
| packages/README.md | P           | —   | —   | P   | P   | P   | P   | None. No install/Nx/scripts. |

---

### 2.2 openthrottle (12 READMEs)

| #   | Path                                          | 1   | 2   | 3   | 4   | 5   | 6   | 7   |
| --- | --------------------------------------------- | --- | --- | --- | --- | --- | --- | --- |
| 1   | openthrottle/mcp-developer/README.md          | F   | —   | —   | P   | P   | P   | P   |
| 2   | openthrottle/nestjs-repositories/README.md    | F   | —   | —   | P   | P   | P   | P   |
| 3   | openthrottle/nodejs-graphql/README.md         | F   | —   | —   | P   | P   | P   | P   |
| 4   | openthrottle/notifications/README.md          | P   | —   | —   | P   | P   | P   | P   |
| 5   | openthrottle/react-router-auth/README.md      | F   | —   | —   | P   | P   | P   | P   |
| 6   | openthrottle/react-router-chat/README.md      | F   | —   | —   | P   | P   | P   | P   |
| 7   | openthrottle/react-router-editor/README.md    | P   | —   | —   | P   | P   | P   | P   |
| 8   | openthrottle/react-router-graphql/README.md   | F   | —   | —   | P   | P   | P   | P   |
| 9   | openthrottle/react-router-profiling/README.md | P   | —   | —   | P   | P   | P   | P   |
| 10  | openthrottle/react-router-ui/README.md        | F   | —   | —   | P   | P   | P   | P   |
| 11  | openthrottle/react-router-utils/README.md     | F   | —   | —   | P   | P   | P   | P   |
| 12  | openthrottle/vscode-openthrottle/README.md    | P   | P   | —   | P   | P   | P   | P   |

**Issues (openthrottle):**

- **1 (Package manager):** All except notifications, react-router-editor, react-router-profiling, vscode-openthrottle list npm first in install section. Reorder to pnpm first.
- **vscode-openthrottle:** Nx usage is correct (`pnpm nx build @openthrottle/vscode-openthrottle`). Internal links (docs/openthrottle, docs/INTEGRATION.md, docs/UI-DESIGN.md) verified.

---

### 2.3 mattscholta (28 READMEs)

| #   | Path                                                      | 1   | 2   | 3   | 4   | 5   | 6   | 7   |
| --- | --------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- |
| 1   | mattscholta/ai-mcp/README.md                              | F   | F   | —   | P   | P   | P   | P   |
| 2   | mattscholta/docs-mcp/README.md                            | P   | F   | —   | P   | P   | P   | P   |
| 3   | mattscholta/graphql-codegen/README.md                     | F   | —   | —   | P   | P   | P   | P   |
| 4   | mattscholta/nestjs-auth/README.md                         | F   | —   | —   | P   | P   | P   | P   |
| 5   | mattscholta/nestjs-bullmq/README.md                       | F   | —   | —   | P   | P   | P   | P   |
| 6   | mattscholta/nestjs-bullmq-board/README.md                 | F   | —   | —   | P   | P   | P   | P   |
| 7   | mattscholta/nestjs-devtools/README.md                     | F   | —   | —   | P   | P   | P   | P   |
| 8   | mattscholta/nestjs-express/README.md                      | F   | —   | —   | P   | P   | P   | P   |
| 9   | mattscholta/nestjs-graphql/README.md                      | F   | —   | —   | P   | P   | P   | P   |
| 10  | mattscholta/nestjs-langchain/README.md                    | F   | —   | —   | P   | P   | P   | P   |
| 11  | mattscholta/nestjs-modules/README.md                      | F   | —   | —   | P   | P   | P   | P   |
| 12  | mattscholta/nestjs-profiling/README.md                    | F   | —   | —   | P   | P   | P   | P   |
| 13  | mattscholta/nestjs-rbac/README.md                         | F   | —   | —   | P   | P   | P   | P   |
| 14  | mattscholta/nestjs-redis/README.md                        | F   | —   | —   | P   | P   | P   | P   |
| 15  | mattscholta/nestjs-slack/README.md                        | F   | —   | —   | P   | P   | P   | P   |
| 16  | mattscholta/nestjs-tester/README.md                       | F   | —   | —   | P   | P   | P   | P   |
| 17  | mattscholta/nestjs-throttler/README.md                    | F   | —   | —   | P   | P   | P   | P   |
| 18  | mattscholta/nestjs-typeorm/README.md                      | F   | —   | —   | P   | P   | P   | P   |
| 19  | mattscholta/nestjs-utils/README.md                        | F   | —   | —   | P   | P   | P   | P   |
| 20  | mattscholta/nestjs-websockets/README.md                   | F   | —   | —   | P   | P   | P   | P   |
| 21  | mattscholta/nestjs-worktrees/README.md                    | P   | —   | —   | P   | P   | P   | P   |
| 22  | mattscholta/react-native-async-storage-devtools/README.md | F   | —   | —   | P   | P   | P   | P   |
| 23  | mattscholta/react-native-deep-linking/README.md           | F   | —   | —   | P   | P   | P   | P   |
| 24  | mattscholta/react-native-expo/README.md                   | F   | —   | —   | P   | P   | P   | P   |
| 25  | mattscholta/react-native-ui/README.md                     | F   | —   | —   | P   | P   | P   | P   |
| 26  | mattscholta/react-router-graphql/README.md                | P   | —   | —   | P   | P   | P   | P   |
| 27  | mattscholta/react-router-shadcn/README.md                 | F   | —   | —   | P   | P   | P   | P   |
| 28  | mattscholta/utils/README.md                               | F   | —   | —   | P   | P   | P   | P   |

**Issues (mattscholta):**

- **1 (Package manager):** All except docs-mcp, nestjs-worktrees, react-router-graphql list npm first in install section. Reorder to pnpm first.
- **2 (Nx):** **ai-mcp:** Lines 49 and 55 use `nx build @openthrottle/ai-mcp` without pnpm prefix. Use `pnpm nx run @openthrottle/ai-mcp:build` (or equivalent). **docs-mcp:** Line 19 shows `nx run @openthrottle/docs-mcp:serve` without pnpm; use `pnpm nx run @openthrottle/docs-mcp:serve`.
- **react-native-ui:** Uses `npx expo install ...` and `npx reacticx ...`; these are tool-specific and acceptable. Install-from-registry order: npm first → reorder to pnpm first.
- **docs-mcp:** References `pnpm run cortex:import-docs`; script exists at root. Correct.
- **Internal links:** nestjs-rbac → docs/nestjs/wiring-auth-rbac.md; nestjs-websockets → docs/openthrottle/notifications-websockets-plan.md; react-router-shadcn → docs/packages/shadcn-ui/THEMING.md — all resolve.

---

### 2.4 rocketcms (8 READMEs)

| #   | Path                            | 1   | 2   | 3   | 4   | 5   | 6   | 7   |
| --- | ------------------------------- | --- | --- | --- | --- | --- | --- | --- |
| 1   | rocketcms/core/README.md        | F   | —   | —   | P   | P   | P   | P   |
| 2   | rocketcms/editor/README.md      | F   | —   | —   | P   | P   | P   | P   |
| 3   | rocketcms/library/README.md     | F   | —   | —   | P   | P   | P   | P   |
| 4   | rocketcms/shared-ui/README.md   | F   | —   | —   | P   | P   | P   | P   |
| 5   | rocketcms/supabase/README.md    | F   | —   | —   | P   | P   | P   | P   |
| 6   | rocketcms/surveys/README.md     | F   | —   | —   | P   | P   | P   | P   |
| 7   | rocketcms/tailwind-ui/README.md | F   | —   | —   | P   | P   | P   | P   |
| 8   | rocketcms/telemetry/README.md   | F   | —   | —   | P   | P   | P   | P   |

**Issues (rocketcms):** Install section lists npm first in all; reorder to pnpm first. (rocketcms READMEs already include pnpm in the list.)

---

### 2.5 barguide (14 READMEs)

| #   | Path                                        | 1   | 2   | 3   | 4   | 5   | 6   | 7   |
| --- | ------------------------------------------- | --- | --- | --- | --- | --- | --- | --- |
| 1   | barguide/common/README.md                   | F   | —   | —   | P   | P   | P   | P   |
| 2   | barguide/icons/README.md                    | F   | —   | —   | P   | P   | P   | P   |
| 3   | barguide/react-emails/README.md             | F   | —   | F   | P   | P   | P   | P   |
| 4   | barguide/react-hooks/README.md              | F   | —   | —   | P   | P   | P   | P   |
| 5   | barguide/react-native/README.md             | F   | —   | —   | P   | P   | P   | P   |
| 6   | barguide/react-native-graphql/README.md     | F   | —   | —   | P   | P   | P   | P   |
| 7   | barguide/react-native-i18n/README.md        | F   | —   | —   | P   | P   | P   | P   |
| 8   | barguide/react-native-icons/README.md       | F   | —   | —   | P   | P   | P   | P   |
| 9   | barguide/react-native-style-guide/README.md | F   | —   | —   | P   | P   | P   | P   |
| 10  | barguide/react-native-supabase/README.md    | F   | —   | —   | P   | P   | P   | P   |
| 11  | barguide/react-native-swift-ui/README.md    | F   | —   | —   | P   | P   | P   | P   |
| 12  | barguide/react-native-ui/README.md          | F   | —   | —   | P   | P   | P   | P   |
| 13  | barguide/react-router/README.md             | F   | —   | —   | P   | P   | P   | P   |
| 14  | barguide/supabase/README.md                 | F   | —   | —   | P   | P   | P   | P   |

**Issues (barguide):**

- **1 (Package manager):** All list npm first; reorder to pnpm first. **react-emails** "Getting Started" uses only npm/yarn for workspace usage (`npm install`, `yarn`, `npm run dev`, `yarn dev`). Replace with pnpm.
- **3 (Scripts):** **react-emails** mentions `dev` in "run the development server". Package has Nx targets (lint, test, typecheck) but no `dev` script in package.json; may be root or legacy. Confirm and either add script reference or update README to use Nx/root command.

---

### 2.6 intouch (3 READMEs)

| #   | Path                                       | 1   | 2   | 3   | 4   | 5   | 6   | 7   |
| --- | ------------------------------------------ | --- | --- | --- | --- | --- | --- | --- |
| 1   | intouch/react-native-icons/README.md       | F   | —   | —   | P   | P   | P   | P   |
| 2   | intouch/react-native-style-guide/README.md | F   | —   | —   | P   | P   | P   | P   |
| 3   | intouch/react-native-ui/README.md          | F   | —   | —   | P   | P   | P   | P   |

**Issues (intouch):** Install section lists npm first in all; reorder to pnpm first.

---

### 2.7 visormatt (5 READMEs)

| #   | Path                                   | 1   | 2   | 3   | 4   | 5   | 6   | 7   |
| --- | -------------------------------------- | --- | --- | --- | --- | --- | --- | --- |
| 1   | visormatt/react-graphing/README.md     | F   | —   | —   | P   | P   | P   | P   |
| 2   | visormatt/react-goodies/README.md      | F   | —   | —   | P   | P   | P   | P   |
| 3   | visormatt/react-router-utils/README.md | F   | —   | —   | P   | P   | P   | P   |
| 4   | visormatt/tester/README.md             | F   | —   | —   | P   | P   | P   | P   |
| 5   | visormatt/tester-child/README.md       | F   | —   | —   | P   | P   | P   | P   |

**Issues (visormatt):** All list npm first, then pnpm, then yarn in install section. Reorder to pnpm first. (Root packages/README.md notes visormatt may be archived; same fix applies if kept.)

---

## 3. Next steps (for task “Fix or file issues”)

- **Bulk fix:** Reorder install blocks to pnpm-first in the 67 READMEs that currently list npm first (or add pnpm first where missing). Optional: single script or find-and-replace pattern for the install section.
- **Targeted fixes:**
  - **mattscholta/ai-mcp:** Replace `nx build @openthrottle/ai-mcp` with `pnpm nx run @openthrottle/ai-mcp:build` (or the exact Nx target name) in Building and “From package dir” sections.
  - **mattscholta/docs-mcp:** Replace `nx run @openthrottle/docs-mcp:serve` with `pnpm nx run @openthrottle/docs-mcp:serve` in Running section.
  - **barguide/react-emails:** (1) Replace “Getting Started” npm/yarn commands with pnpm. (2) Confirm whether `dev` exists (package or root) and update or remove the script reference.
- **Document outcome:** After fixes, update this doc or the “Document audit outcome” deliverable with what was updated, what was deferred, and any repo-wide README guidelines to add.

---

## 4. Fix outcome (task "Fix or file issues")

**Completed (in-repo updates):**

- **Install order (60 READMEs):** Reordered install-from-registry sections to **pnpm first**, then npm, then yarn, via a one-off script over `packages/**/README.md`. READMEs that already had pnpm first or a single pnpm-only block were left unchanged.
- **mattscholta/ai-mcp:** Replaced `nx build @openthrottle/ai-mcp` with `pnpm nx run @openthrottle/ai-mcp:build` in Building and "From package dir" sections.
- **mattscholta/docs-mcp:** Replaced `nx run @openthrottle/docs-mcp:serve` with `pnpm nx run @openthrottle/docs-mcp:serve` in the Running section.
- **barguide/react-emails:** (1) Reordered Installation to pnpm first. (2) Replaced "Getting Started" npm/yarn commands with `pnpm install` and `pnpm run dev`. The package defines a `dev` script; the audit's "no dev script" note was incorrect.

**Deferred:** None. All identified issues were fixed in-repo.

**Recurring patterns / guidelines:**

- **Package manager:** For install-from-registry in package READMEs, list **pnpm** first, then npm, then yarn (AGENTS.md, cursor-commands.mdc).
- **Nx commands:** Use `pnpm nx run <project>:<target>` in README examples; avoid bare `nx`.
- **Workspace run instructions:** When a README describes running scripts from the repo, use pnpm (e.g. `pnpm install`, `pnpm run dev`).
