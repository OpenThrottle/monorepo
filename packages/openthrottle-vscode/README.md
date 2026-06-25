# @openthrottle/openthrottle-vscode

> **Canonical extension is [`vscode-openthrottle`](../vscode-openthrottle), not this package.**
> This package is a non-deployable TypeScript **logic library** for editor-agnostic
> helpers (sorting, config parsing, API/data utilities) that the deployable extension
> can consume. It is **not** the VS Code/Cursor extension itself and must never gain
> extension lifecycle, activation, secret-storage, command, or webview code — that all
> belongs in [`vscode-openthrottle`](../vscode-openthrottle). Keeping the two cleanly
> split is intentional; see that package's README for the matching pointer.

This package is currently an empty scaffold (only a placeholder export). Add real,
editor-agnostic logic here as it is extracted from the extension; do not duplicate
extension code.

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/openthrottle-vscode
```

**npm:**

```bash
npm install @openthrottle/openthrottle-vscode
```
