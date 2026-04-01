import { eslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },
  { ignores: ['**/shadcn-raw/**'] },

  ...eslintConfig,

  {
    rules: {
      // FIXME: Swap out eventually
      '@typescript-eslint/consistent-type-assertions': 'off',
    },
  },
];
