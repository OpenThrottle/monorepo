# Agent personas (`.agents/personas/`)

**Personas** are lightweight **prompt profiles** for agent work: they steer tone, priorities, and review lens. They do **not** replace repo rules, skills, driver selection, or the OpenThrottle plan/task workflow.

## The personas

| id                            | Lens                                        | Reach for it when                                                          |
| ----------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| [`architect`](./architect.md) | System design, boundaries, schema evolution | New modules or packages, cross-package refactors, GraphQL schema changes   |
| [`growth`](./growth.md)       | Adoption, docs, messaging                   | Shipping a CLI or MCP feature, writing docs, error messages, release notes |
| [`legal`](./legal.md)         | Licensing, privacy, secrets, compliance     | External integrations, auth or license-key flows, data collection          |
| [`product`](./product.md)     | Developer UX, scope, acceptance criteria    | Scoping UI/UX, onboarding or plan/task workflow changes before building    |
| [`qa`](./qa.md)               | Test strategy, edge cases, CI parity        | Review before merge, bug fixes, regression risk, flaky tests               |

Each file's frontmatter `description` carries the full **USE WHEN** triggers.

## Who reads them today

- **You, by hand** — attach the file in Claude Code or Cursor (`@.agents/personas/architect.md`) for a review pass.
- **The OT database** — `pnpm run database:import-agent-assets` copies each persona into `custom_prompts` (this README and `_template.md` are skipped). That is an index for search, not a runtime input.

**OT Loop does not read personas.** Neither `skills/ot-loop/SKILL.md` nor the headless job (`packages/openthrottle-agentic-loop`, [design](../../docs/workflows/ot-loop-job.md)) takes a persona or prompt file. The likely future consumer is the per-task critic panel in OT plan `012fa4b0` (correctness / conventions / taste / security lenses); until that lands, do not document persona wiring for OT Loop.

## Personas vs skills

| Concern    | Personas (this folder)                                            | Skills (`skills/` → `.agents/skills/`)            |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| Purpose    | Domain lens (architect, QA, legal, …)                             | Task-specific procedures and tool routing         |
| Scope      | Tone, priorities, output shape                                    | Step-by-step workflows, MCP/tool choice           |
| Invocation | Attached by hand                                                  | Cursor skill attach or discovery in developer app |
| Authority  | Steers _how_ to think; `AGENTS.md` § Code style wins on conflicts | Instructs _what_ to do for a workflow             |

To run a plan end to end use `/ot-loop <planId>`; it owns OT status, task picking and commits. Pair a persona with it by using the persona file for a review pass or by attaching the persona context before you start the loop.

## How to invoke a persona

Open or attach the persona file (e.g. `@.agents/personas/architect.md`) in Claude Code or Cursor for a chat or review. For OT plan work, keep `/ot-loop` as the execution prompt unless you intentionally substitute a persona-only profile.

Do **not** duplicate persona bodies into code or shadow copies elsewhere; this folder is canonical.

## File naming and layout

| Rule                                       | Example                                                       |
| ------------------------------------------ | ------------------------------------------------------------- |
| Kebab-case filename matches persona **id** | `architect.md`, `product.md`, `qa.md`                         |
| One persona per file                       | `.agents/personas/<id>.md`                                    |
| Shared template                            | [`_template.md`](./_template.md) — copy when adding a persona |
| Index                                      | This `README.md`                                              |

## Persona file format

Each persona is Markdown with YAML frontmatter (aligned with `.agents/skills/*/SKILL.md`):

1. **Frontmatter** — `name` (matches filename id), `description` with **USE WHEN** triggers for discovery.
2. **Role** — Who the model is pretending to be.
3. **When to use** — Situations where this lens helps.
4. **Behavior** — **DO** / **DO NOT** bullets (priorities, boundaries).
5. **Output expectations** — What to deliver (checklists, decision records, etc.).
6. **OpenThrottle context** — Pointers to repo docs/skills/rules (not copies of them).

Keep files **short**. Personas adjust emphasis; they do not restate full generator, OT, or GitHub rules — link to [AGENTS.md](../../AGENTS.md), [`docs/monorepo/code-style.md`](../../docs/monorepo/code-style.md), and relevant skills instead.

## Template

Copy [`_template.md`](./_template.md) when adding a persona. Fill every section; remove placeholder comments before committing.

## Related docs

- [`skills/ot-loop/SKILL.md`](../../skills/ot-loop/SKILL.md) — the plan loop
- [OT Loop job](../../docs/workflows/ot-loop-job.md) — the headless implementation
