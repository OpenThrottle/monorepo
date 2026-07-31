import { eslintConfig } from '@tools/dotfiles';

export default [
  {
    ignores: [
      '!**/*',
      '**/*.d.ts',
      '**/*/__generated__',
      '.react-router',
      'node_modules',
      'public/worker.js',
    ],
  },

  ...eslintConfig,

  /**
   * Component primitive shape — enforced hard for this app
   * (docs/monorepo/component-primitive-shape.md). Brought to spec, then flipped
   * from the repo-wide `warn` to `error` so regressions block the build (the
   * per-project ratchet ahead of the global flip). ESLint owns R1-R3 + R6 here;
   * the cross-file R4/R5 dimensions are gated repo-wide by the audit script.
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
