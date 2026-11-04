import { eslintConfig, nodeEsmEslintConfig } from '@tools/dotfiles';

export default [
  {
    ignores: ['!**/*', 'src/generators/**/files/**/*'],
  },

  ...eslintConfig,
  ...nodeEsmEslintConfig,
];
