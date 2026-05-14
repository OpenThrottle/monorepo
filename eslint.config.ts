import { eslintConfig } from '@tools/dotfiles';

export default [
  {
    ignores: [
      '!**/*',
      '.agents/skills/**/*',
      '.opencode/skills/**/*',
      'skills/**/*',
    ],
  },

  ...eslintConfig,

  {
    rules: {
      // FIXME: Swap out eventually
      '@typescript-eslint/consistent-type-assertions': 'off',
    },
  },
];
