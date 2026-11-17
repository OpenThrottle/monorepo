import {
  eslintConfig,
  nestjsEslintConfig,
  nodeEsmEslintConfig,
} from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,

  // NestJS files are `<folder>.<kind>.ts` and export only their kind. At the
  // `src/` root the folder is the package itself, so `src/<name>.module.ts`
  // and `src/<name>.service.ts` already match.
  ...nestjsEslintConfig,

  // ESM + `moduleResolution: nodenext`: Node requires the file extension on
  // every relative specifier, and `eslint --fix` is what writes it.
  ...nodeEsmEslintConfig,
];
