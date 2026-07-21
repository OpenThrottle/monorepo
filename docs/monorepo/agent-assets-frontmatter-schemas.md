# Agent assets frontmatter schemas and validation (phase 1.5)

**Plan-Id:** `862e5d9b-ee96-411f-b4e0-14813dac3b2f`  
**Task-Id:** `53cddacb-267a-45c8-9a83-c069056848d9`  
**Decisions:** D1 (`.agents/` SSOT), D2 (disk write + DB read-only index), D3 (rules `.mdc`), D5 (skills/personas hard-fail; rules warn-only)

This document specifies **YAML frontmatter schemas**, **enforcement points**, and the shared validation library used by CI, ingest (task `e73b7fe0`), and future GraphQL/developer-app forms.

**Implementation:** `@openthrottle/openthrottle-skills` (`packages/openthrottle-skills`).

---

## Enforcement summary (D5)

| Asset type   | Path                             | CI        | Ingest    | On violation                            |
| ------------ | -------------------------------- | --------- | --------- | --------------------------------------- |
| **Skills**   | `.agents/skills/<slug>/SKILL.md` | hard-fail | hard-fail | Exit non-zero; block PR                 |
| **Personas** | `.agents/personas/<id>.md`       | hard-fail | hard-fail | Exit non-zero; block PR                 |
| **Rules**    | `.agents/rules/**/*.mdc`         | warn-only | warn-only | Log warning; continue                   |
| **Prompts**  | `.agents/prompts/*.md`           | TBD       | TBD       | Defer until non-template content exists |

**Skipped paths:** `_template.md`, `README.md`, `.agents/rules/nx-rules.mdc` (generated snapshot).

---

## Schemas (Zod)

Source: `packages/openthrottle-skills/src/schemas/agent-asset-frontmatter.schemas.ts`.

### Skills

| Field                      | Required | Type             | Notes                               |
| -------------------------- | -------- | ---------------- | ----------------------------------- |
| `name`                     | yes      | kebab-case slug  | Must match directory `<slug>`       |
| `description`              | yes      | non-empty string | Supports folded/literal YAML blocks |
| `disable-model-invocation` | no       | boolean          | Cursor skill discovery              |

### Personas

| Field         | Required | Type             | Notes                                |
| ------------- | -------- | ---------------- | ------------------------------------ |
| `name`        | yes      | kebab-case slug  | Must match filename `<id>.md`        |
| `description` | yes      | non-empty string | Should include **USE WHEN** triggers |

Template: [`.agents/personas/_template.md`](../../.agents/personas/_template.md).

### Rules

| Field         | Required | Type    | Notes                                             |
| ------------- | -------- | ------- | ------------------------------------------------- |
| `description` | no       | string  | **Warn** if empty                                 |
| `globs`       | no       | string  | **Warn** if empty and `alwaysApply` is not `true` |
| `alwaysApply` | no       | boolean | Cursor rule attachment                            |

Additional keys are allowed (`.passthrough()`).

---

## Parsers

| Function                  | File                                    | Purpose                                                              |
| ------------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| `parseSkillFrontmatter`   | `parse-skill-frontmatter.ts`            | Developer app list/detail; extended from prior developer-only parser |
| `parseRuleFrontmatter`    | `parse-rule-frontmatter.ts`             | New — Cursor `.mdc` frontmatter                                      |
| `parsePersonaFrontmatter` | `parse-persona-frontmatter.ts`          | Persona discovery (task `d8f6c818`)                                  |
| `parseYamlFrontmatter`    | `frontmatter/parse-yaml-frontmatter.ts` | Shared line parser for scalars, booleans, folded blocks              |

Validation helpers:

- `validateAgentAssetFrontmatter({ kind, path, content, expectedSlug? })`
- `validateAgentAssetsOnDisk({ monorepoRoot })`

---

## Validation points

| Surface                           | Command / import                                         | Behavior                                               |
| --------------------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| **CI**                            | `pnpm nx run monorepo:validate-agent-assets-frontmatter` | Hard-fail on skill/persona errors; print rule warnings |
| **Local**                         | `pnpm run check:local:agent-assets`                      | SSOT symlink guard + frontmatter validation            |
| **Ingest (1.5)**                  | `pnpm nx run monorepo:ingest-agent-assets`               | Same validators before upsert to `custom_prompts`      |
| **GraphQL / developer app forms** | Future                                                   | Reuse Zod schemas; no in-app git bypass (D2)           |

Script: [`scripts/validate-agent-assets-frontmatter.ts`](../../scripts/validate-agent-assets-frontmatter.ts).

---

## Related docs

- [docs/Skills.md](../Skills.md) — skill adoption policy + layout; [skill-sync SKILL.md](../../skills/skill-sync/SKILL.md) — the skill-layout mechanism
- Plan output ADR (task `b7a44bc8`) — D2 disk vs DB authority
- [`.agents/personas/README.md`](../../.agents/personas/README.md) — persona format
