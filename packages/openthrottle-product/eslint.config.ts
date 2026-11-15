import { eslintConfig, sourceFirstEslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,
  ...sourceFirstEslintConfig,
];
