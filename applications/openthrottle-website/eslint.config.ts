import {
  dataFolderEslintConfig,
  eslintConfig,
  preferGraphqlFragmentWarningsEslintConfig,
} from '@tools/dotfiles';

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
  ...dataFolderEslintConfig,

  // Has prefer-graphql-fragment violations; drop this once they are fixed.
  ...preferGraphqlFragmentWarningsEslintConfig,
];
