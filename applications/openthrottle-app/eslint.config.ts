import { eslintConfig, nodeEsmEslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*', '**/*.d.ts', 'dist', 'node_modules', 'out'] },
  ...eslintConfig,
  ...nodeEsmEslintConfig,
];
