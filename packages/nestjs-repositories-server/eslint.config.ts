import {
  eslintConfig,
  nestjsEslintConfig,
  nodeEsmEslintConfig,
} from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },
  ...eslintConfig,

  // NestJS files are `<folder>.<kind>.ts` and export only their kind. At the
  // `src/` root the folder is the package itself, so `src/<name>.module.ts`
  // and `src/<name>.service.ts` already match.
  ...nestjsEslintConfig,

  // ESM + `moduleResolution: nodenext`: Node requires the file extension on
  // every relative specifier, and `eslint --fix` is what writes it.
  ...nodeEsmEslintConfig,

  /**
   * The plans/tasks status-write chokepoint. `RuleApplicationsRepository.
   * orphanUnmatchedApplications` soft-closes an orphaned rule's injected task
   * and captures via a caller-supplied callback, inside the same transaction as
   * the write (this package cannot depend on the server's
   * WorkLedgerCaptureService directly: see the callback's own doc comment). It
   * is the one function here allowed to write a task status.
   */
  {
    files: ['**/*.ts'],
    ignores: ['**/*.test.ts', '**/__tests__/**'],
    rules: {
      'openthrottle/plan-task-status-chokepoint': 'error',
    },
  },
  {
    files: ['**/rule-applications/rule-applications.repository.ts'],
    rules: {
      'openthrottle/plan-task-status-chokepoint': [
        'error',
        { allowedFunctionNames: ['orphanUnmatchedApplications'] },
      ],
    },
  },
];
