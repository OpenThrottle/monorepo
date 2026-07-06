# @openthrottle/openthrottle-vscode — agent notes

Editor-agnostic **logic library** intended to hold helpers (sorting, config parsing, API
utilities) that the OpenThrottle editor extension can consume. Currently an **empty
scaffold** — `src/index.ts` is a single placeholder export.

**Consumed by:** nothing yet — empty scaffold awaiting extraction from the extension.

## Invariants & gotchas

- Source-first (`__build` / `__build-package` placeholders, no `build`) — see
  [../AGENTS.md](../AGENTS.md).
- Boundary: this is the non-deployable logic lib. The deployable VS Code/Cursor extension
  is the sibling [`vscode-openthrottle`](../vscode-openthrottle/) package (note the
  reversed name; its Nx project name is `vscode-openthrottle`, unscoped). Extension
  lifecycle/activation, commands, secret storage, trees, and webviews belong **there**, not
  here. Add only editor-agnostic logic; never duplicate extension code.

## Pointers

- [README.md](./README.md) — the lib-vs-extension split.
- [../vscode-openthrottle/AGENTS.md](../vscode-openthrottle/AGENTS.md) — the deployable side.
