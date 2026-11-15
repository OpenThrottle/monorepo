# Agent personas (`.agents/personas/`)

**Personas** are lightweight **layer-1 prompt profiles** for agent runs: they steer tone, priorities, and review lens for a run. They do **not** replace repo rules, skills, backend selection, or the OpenThrottle plan/task workflow.

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

- **The Ralph runner** — `workflow-ralph --prompt-file .agents/personas/<id>.md` (below). Ralph is slated for retirement in favour of OT Loop.
- **You, by hand** — attach the file in Claude Code or Cursor (`@.agents/personas/architect.md`) for a review pass.
- **The OT database** — `pnpm run database:import-agent-assets` copies each persona into `custom_prompts` (this README and `_template.md` are skipped). That is an index for search, not a runtime input.

**OT Loop does not read personas.** Neither `skills/ot-loop/SKILL.md` nor the headless job (`packages/openthrottle-agentic-loop`, [design](../../docs/workflows/ot-loop-job.md)) takes a persona or prompt file. The likely future consumer is the per-task critic panel in OT plan `012fa4b0` (correctness / conventions / taste / security lenses); until that lands, do not document persona wiring for OT Loop.

## Personas vs skills vs Ralph

| Concern    | Personas (this folder)                                            | Skills (`skills/` → `.agents/skills/`)            | Default Ralph (`/agents-ralph`)                                   |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| Purpose    | Domain lens (architect, QA, legal, …)                             | Task-specific procedures and tool routing         | Full OT plan loop: create tasks, one-at-a-time execution, commits |
| Scope      | Tone, priorities, output shape                                    | Step-by-step workflows, MCP/tool choice           | End-to-end agentic loop                                           |
| Invocation | `--prompt-file` (see below)                                       | Cursor skill attach or discovery in developer app | `--prompt /agents-ralph` (default)                                |
| Authority  | Steers _how_ to think; `AGENTS.md` § Code style wins on conflicts | Instructs _what_ to do for a workflow             | Owns OT status, task picking, `<ralph:task-complete>` signals     |

**Layer model**:

1. **Prompt (layer 1)** — Persona or Ralph skill file (`--prompt` / `--prompt-file`).
2. **Execution backend (layer 2)** — `cursor` or `claude` (`--backend`); unchanged by personas.
3. **Run tuning (layer 3)** — Iterations, timeouts, model, worktree (`--iterations`, env, `.workflow-ralph.json`).

Personas sit in layer 1 only. Pair a persona with the default Ralph loop by using a **persona file for a review pass** or by composing manually (attach persona context in Cursor, then run Ralph for execution). For automated queue runs, point `--prompt-file` at a persona when you want that lens for the whole iteration; use `/agents-ralph` when you need the full OT task loop.

## How to invoke a persona

### Ralph CLI (`workflow-ralph`)

From the monorepo root:

```bash
pnpm exec workflow-ralph --plan <plan-uuid> \
  --prompt-file .agents/personas/architect.md \
  --prompt-file skills/agents-ralph/SKILL.md \
  --prompt-file .agents/skills/shadcn/SKILL.md
```

- **`--prompt-file`** — UTF-8 path (relative to cwd or absolute). Repeat the flag to compose persona + skills; YAML frontmatter is stripped from each file before concatenation (same as skills).
- Mutually exclusive with **`--prompt`** (named profile) and **`--prompt-stdin`**.
- Env: `WORKFLOW_RALPH_PROMPT_FILE=.agents/personas/qa.md`
- Defaults file: `"promptFile": ".agents/personas/product.md"` in `.workflow-ralph.json`

Precedence: **CLI → env → `.workflow-ralph.json` → built-ins**. See [tools/workflows/README.md](../../tools/workflows/README.md).

### Claude Code or Cursor (interactive)

1. Open or attach the persona file (e.g. `@.agents/personas/architect.md`) for a chat or review.
2. For Ralph-driven OT work, keep **`/agents-ralph`** (or `skills/agents-ralph/SKILL.md` via `--prompt-file`) as the execution prompt unless you intentionally substitute a persona-only profile.

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

- [Ralph design](../../docs/workflows/ralph-design.md) — OT-injected plan context
- [`skills/agents-ralph/SKILL.md`](../../skills/agents-ralph/SKILL.md) — default Ralph loop
- [`tools/workflows/README.md`](../../tools/workflows/README.md) — Ralph CLI and queue summary
