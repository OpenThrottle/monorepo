import { eslintConfig } from '@tools/dotfiles';

export default [
  {
    ignores: [
      '!**/*',
      '**/*.d.ts',
      '**/*/__generated__',
      '.react-router',
      'node_modules',
      'public/worker.js',
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
