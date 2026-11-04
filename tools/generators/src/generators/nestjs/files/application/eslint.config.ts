import { eslintConfig, nodeEsmEslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },

  ...eslintConfig,

  // ESM + `moduleResolution: nodenext`: Node requires the file extension on
  // every relative specifier, and `eslint --fix` is what writes it.
  ...nodeEsmEslintConfig,
];
