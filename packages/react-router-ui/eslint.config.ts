import { eslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },

  ...eslintConfig,

  /**
   * Component primitive shape — enforced hard for this package
   * (docs/monorepo/component-primitive-shape.md). Brought to spec, then flipped
   * from the repo-wide `warn` to `error` so regressions block the build (the
   * per-project ratchet ahead of the global flip).
   */
  {
    files: ['**/components/**/*.tsx'],
    ignores: ['**/__tests__/**', '**/*.test.tsx'],
    rules: {
      'max-lines': [
        'error',
        { max: 210, skipBlankLines: false, skipComments: false },
      ],
      'openthrottle/component-primitive-shape': 'error',
    },
  },
];
