import { eslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },

  ...eslintConfig,

  /**
   * Component primitive shape — enforced hard for this package.
   *
   * `react-router-profiling` is fully conformant with
   * docs/monorepo/component-primitive-shape.md, so the rule (and the R6
   * `max-lines` cap) are flipped from the repo-wide `warn` to `error` here.
   * This is the per-project ratchet: each area is brought to spec, then locked
   * so `nx lint` regressions block the build, ahead of the global flip. The
   * cross-file R4/R5 dimensions are covered repo-wide by the audit script
   * (`pnpm run audit:component-shape`), which becomes a `--strict` CI gate at
   * the global flip.
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
