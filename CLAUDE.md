<!-- @~/.claude/info.md -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Everything that applies to every agent — what the repo is, commands, architecture, the GraphQL codegen flow, generators, code style, git rules, OT plans — lives in [AGENTS.md](./AGENTS.md). Claude Code loads it only with the user-global `agents-md` setting: [docs/monorepo/agent-editor-folders.md § Claude Code: load `AGENTS.md`](docs/monorepo/agent-editor-folders.md#claude-code-load-agentsmd-global-only-setting) (`pnpm run check:claude-settings` checks it). This file adds only what is specific to Claude Code.

## Claude Code config

`.claude/settings.json`, and `.claude/skills/` — a generated fan-out from `.agents/skills/` (Cursor reads `.agents/skills/` directly, so there is no `.cursor/skills` copy). Never hand-edit a generated skills dir; edit `skills/` and re-sync. Layout and duplication strategy: [docs/monorepo/agent-editor-folders.md](docs/monorepo/agent-editor-folders.md).

## Picking the right models for workflows and subagents

Rankings, higher = better. Cost reflects what I actually pay (OpenAI has really generous limits), not list price. Intelligence is how hard a problem you can hand the model unsupervised. Taste covers UI/UX, code quality, API design, and copy.

| model    | current version | cost | intelligence | taste |
| -------- | --------------- | ---- | ------------ | ----- |
| `sonnet` | Sonnet 5.5      | 5    | 6            | 7     |
| `opus`   | Opus 5.5        | 4    | 8            | 8     |
| `fable`  | Fable 5.2       | 2    | 9            | 9     |

How to apply:

- These are defaults, not limits. You have standing permission to override them: if a cheaper model's output doesn't meet the bar, rerun or redo the work with a smarter model without asking. Judge the output, not the price tag. Escalating costs less than shipping mediocre work.
- Cost is a tie-breaker only; when axes conflict for anything that ships, intelligence > taste > cost.
- Bulk/mechanical work (clear-spec implementation, data analysis, migrations): sonnet - it's effectively free.
- Anything user-facing (UI, copy, API design) needs taste ≥ 7.
- Reviews of plans/implementations: fable or opus, optionally sonnet as an extra independent perspective.
- Never use Haiku.
- Claude models run via the Agent/Workflow model parameter using the aliases `sonnet` / `opus` / `fable`, which always resolve to the latest version in each family.
