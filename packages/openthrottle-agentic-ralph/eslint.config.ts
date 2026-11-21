import {
  eslintConfig,
  preferGraphqlFragmentWarningsEslintConfig,
} from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,

  // Has prefer-graphql-fragment violations; drop this once they are fixed.
  ...preferGraphqlFragmentWarningsEslintConfig,
];
