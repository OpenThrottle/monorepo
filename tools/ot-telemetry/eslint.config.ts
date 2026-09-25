import { eslintConfig, nodeEsmEslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,
  ...nodeEsmEslintConfig,
];
