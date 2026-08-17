import { eslintConfig } from '@tools/dotfiles';

export default [
  {
    ignores: ['!**/*', '**/*.d.ts', 'node_modules', 'storybook-static'],
  },

  ...eslintConfig,
];
