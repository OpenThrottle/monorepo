import { eslintConfig } from '@tools/dotfiles';

export default [
  {
    ignores: ['!**/*', 'src/generators/**/files/**/*'],
  },

  ...eslintConfig,
];
