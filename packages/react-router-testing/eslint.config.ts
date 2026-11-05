import { dataFolderEslintConfig, eslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,
  ...dataFolderEslintConfig,
];
