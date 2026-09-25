import { eslintConfig, nodeEsmEslintConfig } from '@tools/dotfiles';

// ESM + `moduleResolution: nodenext`: Node requires the file extension on
// every relative specifier, and `eslint --fix` is what writes it.
export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,
  ...nodeEsmEslintConfig,

  /**
   * The plans/tasks status-write chokepoint. This override must live in this
   * project's own config: nx lints with cwd at the project, where the shared
   * config's `packages/nestjs-repositories/**` prefix can't match the
   * project-relative paths (same reason `component-primitive-shape`'s
   * shadcn-primitive override lives in
   * `packages/react-router-shadcn/eslint.config.ts` instead of the shared
   * config alone — see the fuller reasoning in `@tools/dotfiles`' own
   * `index.ts`). Enabled at `error` repo-wide within this project, with one
   * narrower override for the sanctioned chokepoint below.
   */
  {
    files: ['**/*.ts'],
    ignores: ['**/*.test.ts', '**/__tests__/**'],
    rules: {
      'openthrottle/plan-task-status-chokepoint': 'error',
    },
  },
  {
    // orphanUnmatchedApplications soft-closes an orphaned rule's injected task
    // and captures via a caller-supplied callback, inside the same
    // transaction as the write (this package cannot depend on the server's
    // WorkLedgerCaptureService directly — see the callback's own doc comment).
    files: ['**/tag-action-rules/rule-applications.service.ts'],
    rules: {
      'openthrottle/plan-task-status-chokepoint': [
        'error',
        { allowedFunctionNames: ['orphanUnmatchedApplications'] },
      ],
    },
  },
];
