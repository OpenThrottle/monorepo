# Agent personas (`.agents/personas/`)

**Personas** are lightweight **layer-1 prompt profiles** for Ralph and Cursor: they steer tone, priorities, and review lens for a run. They do **not** replace repo rules, skills, backend selection, or the OpenThrottle plan/task workflow.

## Personas vs skills vs Ralph

| Concern    | Personas (this folder)                                    | Skills (`.agents/skills/`, `.cursor/skills/`)     | Default Ralph (`/agents-ralph`)                                   |
| ---------- | --------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| Purpose    | Domain lens (architect, QA, legal, …)                     | Task-specific procedures and tool routing         | Full OT plan loop: create tasks, one-at-a-time execution, commits |
| Scope      | Tone, priorities, output shape                            | Step-by-step workflows, MCP/tool choice           | End-to-end agentic loop                                           |
| Invocation | `--prompt-file` (see below)                               | Cursor skill attach or discovery in developer app | `--prompt /agents-ralph` (default)                                |
| Authority  | Steers _how_ to think; `.cursor/rules/` wins on conflicts | Instructs _what_ to do for a workflow             | Owns OT status, task picking, `<ralph:task-complete>` signals     |

**Layer model** (see [ralph-workflow-runtime-config.md](../../docs/workflows/ralph-workflow-runtime-config.md)):

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
  --prompt-file .cursor/skills/agents-ralph/SKILL.md \
  --prompt-file .agents/skills/shadcn/SKILL.md
```

- **`--prompt-file`** — UTF-8 path (relative to cwd or absolute). Repeat the flag to compose persona + skills; YAML frontmatter is stripped from each file before concatenation (same as skills).
- Mutually exclusive with **`--prompt`** (named profile) and **`--prompt-stdin`**.
- Env: `WORKFLOW_RALPH_PROMPT_FILE=.agents/personas/qa.md`
- Defaults file: `"promptFile": ".agents/personas/product.md"` in `.workflow-ralph.json`

Precedence: **CLI → env → `.workflow-ralph.json` → built-ins**. See [tools/workflows/README.md](../../tools/workflows/README.md) and [ralph-config-migration.md](../../docs/workflows/ralph-config-migration.md).

### Cursor (interactive)

1. Open or attach the persona file (e.g. `@.agents/personas/architect.md`) for a chat or review.
2. For Ralph-driven OT work, keep **`/agents-ralph`** (or `.cursor/skills/agents-ralph/SKILL.md` via `--prompt-file`) as the execution prompt unless you intentionally substitute a persona-only profile.

Do **not** duplicate persona bodies into code or shadow copies elsewhere; this folder is canonical.

## File naming and layout

| Rule                                       | Example                                                       |
| ------------------------------------------ | ------------------------------------------------------------- |
| Kebab-case filename matches persona **id** | `architect.md`, `product.md`, `qa.md`                         |
| One persona per file                       | `.agents/personas/<id>.md`                                    |
| Shared template                            | [`_template.md`](./_template.md) — copy when adding a persona |
| Index                                      | This `README.md`                                              |

Planned first-pass personas: **architect**, **product**, **qa**, **legal**, **growth**.

## Persona file format

Each persona is Markdown with YAML frontmatter (aligned with `.agents/skills/*/SKILL.md`):

1. **Frontmatter** — `name` (matches filename id), `description` with **USE WHEN** triggers for discovery.
2. **Role** — Who the model is pretending to be.
3. **When to use** — Situations where this lens helps.
4. **Behavior** — **DO** / **DO NOT** bullets (priorities, boundaries).
5. **Output expectations** — What to deliver (checklists, decision records, etc.).
6. **OpenThrottle context** — Pointers to repo docs/skills/rules (not copies of them).

Keep files **short**. Personas adjust emphasis; they do not restate full generator, OT, or GitHub rules — link to [AGENTS.md](../../AGENTS.md), [`.cursor/rules/`](../../.cursor/rules/), and relevant skills instead.

## Template

Copy [`_template.md`](./_template.md) when adding a persona. Fill every section; remove placeholder comments before committing.

## Related docs

- [Ralph workflow runtime config](../../docs/workflows/ralph-workflow-runtime-config.md) — three-layer mental model
- [Ralph design](../../docs/workflows/ralph-design.md) — OT-injected plan context
- [`.cursor/skills/agents-ralph/SKILL.md`](../../.cursor/skills/agents-ralph/SKILL.md) — default Ralph loop
- [`.agents/skills/workflow-ralph/SKILL.md`](../skills/workflow-ralph/SKILL.md) — CLI and queue summary
