import { eslintConfig, nodeEsmEslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },

  ...eslintConfig,

  // ESM + `moduleResolution: nodenext`: Node requires the file extension on
  // every relative specifier, and `eslint --fix` is what writes it.
  ...nodeEsmEslintConfig,

  // NestJS files are `<folder>.<kind>.ts` and export only their kind. The REPL
  // entry keeps its name: `package.json` `sideEffects` names `./src/repl.ts` by
  // path, and like `main.ts` it is a process entry rather than a Nest unit.
  {
    files: ['src/repl.ts'],
    rules: {
      'openthrottle/nestjs-file-exports': 'off',
      'openthrottle/nestjs-file-naming': 'off',
    },
  },
];
