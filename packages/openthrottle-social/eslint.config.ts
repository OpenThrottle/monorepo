import {
  eslintConfig,
  nodeEsmEslintConfig,
  sourceFirstEslintConfig,
} from '@tools/dotfiles';

// Source-first, and run directly by Node's type stripping from the scheduled
// jobs, so every relative import carries its `.ts` extension.
export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,
  ...nodeEsmEslintConfig,
  ...sourceFirstEslintConfig,
];
