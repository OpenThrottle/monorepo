import { eslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },

  ...eslintConfig,

  {
    rules: {
      // FIXME: Swap out eventually
      '@typescript-eslint/consistent-type-assertions': 'off',
    },
  },
];
