import { eslintConfig, nodeEsmEslintConfig } from '@tools/dotfiles';

export default [
  { ignores: ['!**/*'] },

  ...eslintConfig,

  // ESM + `moduleResolution: nodenext`: Node requires the file extension on
  // every relative specifier, and `eslint --fix` is what writes it.
  ...nodeEsmEslintConfig,

  /**
   * The plans/tasks status-write chokepoint (282 plans were found to
   * disagree with their own last recorded transition because a writer
   * changed `.status` without going through `PlanStatusService` /
   * `applyBulkTaskStatusChange` / an inline-capturing writer and recording a
   * `status_change` work-ledger artifact — see docs/monorepo/work-ledger-
   * sessions.md). This override must live in this project's own config: nx
   * lints with cwd at the project, where the shared config's
   * `applications/openthrottle-server/**` prefix can't match the
   * project-relative paths (same reason `component-primitive-shape`'s
   * shadcn-primitive override lives in
   * `packages/react-router-shadcn/eslint.config.ts` instead of the shared
   * config alone). Enabled at `error` repo-wide within this project; each
   * sanctioned chokepoint gets its own narrower override below naming
   * exactly the function(s) — via `allowedFunctionNames` — that the write
   * sits in, rather than an `eslint-disable` comment in the source
   * (invisible at review time, and exactly what let the silent writers
   * through before this rule existed). No exemption for `plans.processor`.
   */
  {
    files: ['**/*.ts'],
    ignores: ['**/*.test.ts', '**/__tests__/**'],
    rules: {
      'openthrottle/plan-task-status-chokepoint': 'error',
    },
  },
  {
    // The plan chokepoint itself. `cancelRun` calls `applyStatusChange` but
    // then force-normalizes `plan.status`/`plan.completedAt` to PENDING
    // unconditionally afterward (matching the unconditional `UPDATE` it
    // replaced) — a second, deliberate write in the same chokepoint file and
    // the same transaction as the `applyStatusChange` call, not a bypass.
    files: ['**/graphql/plans/plan-status.service.ts'],
    rules: {
      'openthrottle/plan-task-status-chokepoint': [
        'error',
        {
          allowedFunctionNames: [
            'applyStatusChange',
            'writeGuardedStatus',
            'cancelRun',
          ],
        },
      ],
    },
  },
  {
    // The bulk task-status chokepoint: select-lock-update-capture behind
    // every path that changes many tasks' status in one call.
    files: ['**/graphql/work-ledger/bulk-task-status-change.ts'],
    rules: {
      'openthrottle/plan-task-status-chokepoint': [
        'error',
        { allowedFunctionNames: ['applyBulkTaskStatusChange'] },
      ],
    },
  },
  {
    // updateTask captures its own status_change artifact inline, in the same
    // transaction as its save — immediately adjacent to the write, not routed
    // through a shared chokepoint function.
    files: ['**/graphql/tasks/tasks.resolver.ts'],
    rules: {
      'openthrottle/plan-task-status-chokepoint': [
        'error',
        { allowedFunctionNames: ['updateTask'] },
      ],
    },
  },
  {
    // reviveSoftClosedTask (delete-to-reset / orphan-revive) captures inline.
    files: ['**/queues/plan-rules/inject-task.executor.ts'],
    rules: {
      'openthrottle/plan-task-status-chokepoint': [
        'error',
        { allowedFunctionNames: ['reviveSoftClosedTask'] },
      ],
    },
  },
  {
    // closeOutSourceTask (task-promotion step 4) captures inline.
    files: ['**/queues/task-promotion/task-promotion.service.ts'],
    rules: {
      'openthrottle/plan-task-status-chokepoint': [
        'error',
        { allowedFunctionNames: ['closeOutSourceTask'] },
      ],
    },
  },
];
