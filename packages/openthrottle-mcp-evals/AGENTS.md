# @openthrottle/openthrottle-mcp-evals — agent notes

The on-demand tool-selection eval for the OpenThrottle MCP server: does a model, shown the real
`tools/list` surface, pick the right tool for each case? Runs on the `@openthrottle/agentic-evals`
core and reads the surface through `@openthrottle/openthrottle-mcp/tool-surface`. Nothing imports
this package; it is run, not consumed.

## Invariants & gotchas

- **Source-first, on purpose** (`__build` placeholders, `main`/`exports` → `src/`). It is a `tsx`
  runner with no consumers, so a `dist/` would only be something to keep fresh. Its targets depend on
  `^build` because `@openthrottle/openthrottle-mcp` is the built tier and must have a current `dist/`.
- **`eval-tool-selection` is on demand only and never runs in CI or `check:local`.** It spends real
  money. The default `--driver api` needs `ANTHROPIC_API_KEY` and spends API tokens, and
  `--driver claude,codex` spends subscription usage. Only the grader unit tests run through `test`. Run it after
  rewording a tool description or the instructions block; a fix case must fail before its fix lands.
- **The sandbox replaces the real server, never sits beside it.** `src/sandbox/bin-sandbox.ts` is
  spawned by path from `cli.ts`, not imported, so moving either file means updating `SANDBOX_ENTRY`.
  A CLI call the sandbox did not serve stops the run with exit 3.
- **The surface comes from `@openthrottle/openthrottle-mcp/tool-surface` only.** Never deep-import the
  MCP package; if the suite needs more of it, widen that public subpath.

## Pointers

- [src/tool-selection/README.md](src/tool-selection/README.md) — cases, graders, baselines, flags.
- [docs/openthrottle/evals-running-suites.md](../../docs/openthrottle/evals-running-suites.md) — how
  every eval suite runs.
