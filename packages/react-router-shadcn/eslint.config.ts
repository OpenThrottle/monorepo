import { eslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },
  { ignores: ['**/shadcn-raw/**'] },

  ...eslintConfig,

  {
    rules: {
      // `cn` is built on clsx, so this package is the one place the shared
      // config's clsx import ban does not apply.
      'no-restricted-imports': 'off',
      // Vendored shadcn/Radix primitives intentionally export a family of
      // Root/Trigger/Content subcomponents per file, so one-component-per-file
      // does not apply here.
      'react/no-multi-comp': 'off',
    },
  },

  /**
   * Vendored shadcn hooks (`useIsMobile`, …) are out of scope for the hook
   * shape (docs/monorepo/hook-primitive-shape.md § Scope): re-syncing from
   * upstream must stay a diff, not a rewrite. Turned off here for the same
   * reason as the component override below — the base config's
   * `packages/react-router-shadcn/**` ignore can't match under nx's
   * package-relative cwd.
   */
  {
    files: ['**/hooks/use*.{ts,tsx}'],
    rules: {
      'openthrottle/hook-primitive-shape': 'off',
    },
  },

  /**
   * The shadcn primitive variant of the component shape
   * (docs/monorepo/component-shape-shadcn-variant.md). These files are the
   * multi-export / forwardRef / cva primitive families the base authored shape
   * can't map, so the base `component-primitive-shape` (authored) rule + the
   * `max-lines` cap are replaced here by the `primitive` profile. Enforced at
   * `error` now that the whole package is at spec (plan task 5) — regressions
   * block the build. This override must live in the package config: nx lints
   * with cwd at the package, where the base config's
   * `packages/react-router-shadcn/**` ignore can't match the package-relative
   * paths.
   */
  {
    files: ['**/components/**/*.tsx'],
    ignores: [
      '**/*-test-utils.tsx',
      '**/*.example.tsx',
      '**/*.stories.tsx',
      '**/*.test.tsx',
    ],
    rules: {
      // VR6 (size cap) is report-only via the audit — a few compound families
      // (e.g. Avatar) sit over 210 by design; the audit reports them.
      'max-lines': 'off',
      'openthrottle/component-primitive-shape': [
        'error',
        { profile: 'primitive' },
      ],
    },
  },
];
