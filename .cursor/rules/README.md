# Code-writing preferences and style guide

This directory is the **single source of truth** for how we write code in this repo. It is intended for both **agents** (e.g. Cursor, Ralph) and **humans** to reference when writing or reviewing code.

## Location

- **Root:** [`.cursor/rules/`](./)
- **Coding conventions:** [`.cursor/rules/coding/`](./coding/) — TypeScript/JavaScript style, types, naming, testing hints
- **Command/context rules:** [`.cursor/rules/commands/`](./commands/) — When to use OpenThrottle (OT), GitHub, agents, etc.

## What lives here

- Commit message rules (including no Co-authored-by) live in `commands/github.mdc`.
- **`coding/`** — Per-topic rules (default exports, return types, naming, JSDoc, discriminated unions, etc.). These are applied by Cursor when editing. Add or edit `.mdc` files here to evolve style.
- **`commands/`** — Rules for Cursor commands and external systems (OpenThrottle/OT, GitHub, agents). Use these when answering “when do I use X?”.
- **Root `.mdc` files** — General rules (e.g. personal preferences, generators, cursor-commands) that apply across the workspace. For **new code**, agents must check and use `@tools/generators` generators first; see [personal-generators.mdc](./personal-generators.mdc) and [docs/tools/templates/AGENT_USAGE.md](../../docs/tools/templates/AGENT_USAGE.md).

## Agent behavior

- **Plans in OT only:** Plans and tasks MUST be created and managed in OpenThrottle via the OT MCP (mcp-developer; `create_plan`, `create_task`). Do **not** create plans in Markdown files or under `docs/`.
- **Fail loudly when unavailable:** If the OT MCP is unavailable or plan/task creation fails, report the error clearly to the user. Do **not** silently fall back to writing a plan to a `.md` file or skipping. See `.cursor/rules/commands/cortex.mdc` and `.cursor/rules/commands/agents.mdc` for command-level rules.
- **Generators first:** Before writing new code, components, or services, check for and use `@tools/generators` generators. See [personal-generators.mdc](./personal-generators.mdc) and [docs/tools/templates/AGENT_USAGE.md](../../docs/tools/templates/AGENT_USAGE.md).

## How to use

- **Humans:** Read this README and the rules under `coding/` and `commands/` when contributing. [CONTRIBUTING.md](../../CONTRIBUTING.md) points here for code style.
- **Agents:** Prefer these rules over generic style; follow `coding/` for structure, types, and naming, and `commands/` for when to call which tools or commands.

## Evolving preferences

1. **New topic:** Add a new `.mdc` file under `coding/` (or `commands/` if it’s command/tool behavior). Use a short, descriptive name (e.g. `optional-chaining.mdc`).
2. **Existing topic:** Edit the corresponding `.mdc` in `coding/` or `commands/`.
3. **Testing/style tooling:** Document expectations here first; then add or adjust ESLint/Prettier/TypeScript config to match.

This README and the rules under `coding/` and `commands/` can be updated over time as preferences evolve.
