# @tools/dotfiles

Common configuration across the OpenThrottle organization. This package provides shared ESLint, Prettier, Vite, and Vitest configurations used across the monorepo.

## Purpose

This package centralizes common configuration files to ensure consistency across all packages and applications in the monorepo. It exports:

- **ESLint Configuration**: Shared ESLint flat config with TypeScript, React, and Nx rules
- **Prettier Configuration**: The single source of truth for Prettier (`prettierConfig`) — the only place the options object is defined
- **Vite Configuration**: Utilities for creating Vite configs (`createViteConfig`, `defineViteConfig`)
- **Vitest Configuration**: Utilities for creating Vitest configs with different test environments (jsdom, happy-dom, node)

## Installation

This is a private package within the monorepo. It's automatically available to all packages via the workspace.

## Usage

### ESLint Configuration

```typescript
import { eslintConfig } from '@tools/dotfiles';

// Use in your eslint.config.ts
export default eslintConfig;
```

### Prettier Configuration

The monorepo's single `.prettierrc.mjs` (at the repo root) re-exports this config; there are **no per-app Prettier configs** — Prettier resolves the root config for every directory.

```javascript
// .prettierrc.mjs
import { prettierConfig } from '@tools/dotfiles';

export default prettierConfig;
```

`prettierConfig` wires `prettier-plugin-tailwindcss` (Tailwind class sorting) and pins YAML to **single quotes** via a `*.{yml,yaml}` override. Keep that in sync with the `quote_type = single` entries in the root `.editorconfig` so editors and Prettier agree. Format the repo with `pnpm format` / check it with `pnpm format:check` (or `pnpm nx run monorepo:format-write` / `format-check`).

### Vite Configuration

```typescript
import { createViteConfig } from '@tools/dotfiles';

export default createViteConfig({
  // Your Vite options
});
```

### Vitest Configuration

```typescript
import { createVitestConfigJsdom } from '@tools/dotfiles';

export default createVitestConfigJsdom({
  // Your Vitest options
});
```

## Exports

- `eslintConfig` - ESLint flat config with TypeScript, React, and Nx rules
- `prettierConfig` - Shared Prettier options
- `createViteConfig` - Create Vite configuration
- `defineViteConfig` - Define Vite configuration
- `createVitestConfig` - Create Vitest configuration
- `createVitestConfigJsdom` - Create Vitest config with jsdom environment
- `createVitestConfigHappyDom` - Create Vitest config with happy-dom environment
- `createVitestConfigNode` - Create Vitest config with node environment
- `getDirname` - Utility to get directory name in ESM context

## Development

This is a source-first package: `main`/`types` point at `./src/index.ts` and
consumers transpile it directly, so there is **no `build` target** and no
`dist/` output. Import it by name (`@tools/dotfiles`) from consuming projects;
within this package itself use relative `./src/...` imports (the
`@nx/enforce-module-boundaries` rule forbids self-referencing by package name).

From the monorepo root:

```bash
pnpm nx run @tools/dotfiles:lint
pnpm nx run @tools/dotfiles:test
```
