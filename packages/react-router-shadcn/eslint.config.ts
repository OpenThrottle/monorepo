import { eslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },
  { ignores: ['**/shadcn-raw/**'] },

  ...eslintConfig,

  {
    rules: {
      // Vendored shadcn/Radix primitives intentionally export a family of
      // Root/Trigger/Content subcomponents per file, so one-component-per-file
      // does not apply here.
      'react/no-multi-comp': 'off',
    },
  },
];
