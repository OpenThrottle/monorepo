import {
  eslintConfig,
  nestjsEslintConfig,
  nodeEsmEslintConfig,
} from '@tools/dotfiles';

// ESM + `moduleResolution: nodenext`: Node requires the file extension on
// every relative specifier, and `eslint --fix` is what writes it.
export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,
  ...nodeEsmEslintConfig,
  ...nestjsEslintConfig,
  // `src/bin.ts` is the package's CLI entry: `package.json#bin` and every
  // consumer's `graphql-schema` target name `dist/src/bin.js` by path.
  {
    files: ['src/bin.ts'],
    rules: {
      'openthrottle/nestjs-file-exports': 'off',
      'openthrottle/nestjs-file-naming': 'off',
    },
  },
];
