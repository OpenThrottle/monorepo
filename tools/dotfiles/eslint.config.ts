import { eslintConfig, sourceFirstEslintConfig } from './src/index.ts';

// This package is source-first: its `exports` name ./src/, so consumers get raw
// TypeScript. See docs/monorepo/source-first-packages-and-strip-only.md.
export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,
  ...sourceFirstEslintConfig,
];
