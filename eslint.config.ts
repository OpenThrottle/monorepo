import { eslintConfig } from '@tools/dotfiles';

export default [
  {
    ignores: [
      '!**/*',
      '.agents/skills/**/*',
      '.opencode/plugins/**/*',
      '.opencode/skills/**/*',
      'skills/**/*',
    ],
  },

  ...eslintConfig,
];
