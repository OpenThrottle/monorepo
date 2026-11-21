import {
  eslintConfig,
  nodeEsmEslintConfig,
  preferGraphqlFragmentWarningsEslintConfig,
} from '@tools/dotfiles';

// ESM + `moduleResolution: nodenext`: Node requires the file extension on
// every relative specifier, and `eslint --fix` is what writes it.
export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,
  ...nodeEsmEslintConfig,

  // Has prefer-graphql-fragment violations; drop this once they are fixed.
  ...preferGraphqlFragmentWarningsEslintConfig,
];
