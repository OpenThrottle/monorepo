import { eslintConfig, nodeEsmEslintConfig } from '@tools/dotfiles';

// ESM + `moduleResolution: nodenext`: Node requires the file extension on
// every relative specifier, and `eslint --fix` is what writes it.
export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,
  ...nodeEsmEslintConfig,
];
