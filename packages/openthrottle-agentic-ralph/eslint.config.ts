import { eslintConfig } from '@tools/dotfiles';
// import { importX } from 'eslint-plugin-import-x';

export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,

  // importX.flatConfigs.recommended,
  // importX.flatConfigs.typescript,

  // {
  //   rules: {
  //     'import-x/no-dynamic-require': 'warn',
  //     'import-x/no-nodejs-modules': 'warn',
  //   },
  // },
];
