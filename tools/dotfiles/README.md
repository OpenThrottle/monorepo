# @tools/dotfiles

Common configuration across the OpenThrottle organization. This package provides shared ESLint configurations, Vite configs, and Vitest configs used across the monorepo.

## Purpose

This package centralizes common configuration files to ensure consistency across all packages and applications in the monorepo. It exports:

- **ESLint Configuration**: Shared ESLint flat config with TypeScript, React, and Nx rules
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

### Vite Configuration

```typescript
import { createViteConfig } from '@tools/dotfiles/vite-config';

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
- `createViteConfig` - Create Vite configuration
- `defineViteConfig` - Define Vite configuration
- `createVitestConfig` - Create Vitest configuration
- `createVitestConfigJsdom` - Create Vitest config with jsdom environment
- `createVitestConfigHappyDom` - Create Vitest config with happy-dom environment
- `createVitestConfigNode` - Create Vitest config with node environment
- `getDirname` - Utility to get directory name in ESM context

## Development

From the monorepo root:

```bash
pnpm nx run @tools/dotfiles:build
pnpm nx run @tools/dotfiles:lint
pnpm nx run @tools/dotfiles:test
```
