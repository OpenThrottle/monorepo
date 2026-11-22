/**
 * @description Episode 11-ralph-one-task — Ralph — run a plan one task at a time
 *
 * Migrated verbatim from `docs/marketing/scripts/11-ralph-one-task.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * **Replay.** The run's output stream is pre-baked by the demo seed; the flow drives
 * the UI that renders it. Recording a live model call here would produce a different
 * video every take and a failed take whenever the model wanders.
 */

import type { VideoEpisode } from '../types.ts';

export const episode: VideoEpisode = {
  beats: [
    {
      action: 'Plan detail, one task IN_PROGRESS, output streaming below it.',
      t: '0:00',
    },
    {
      action: 'Highlight the task list — one in progress, the rest pending.',
      t: '0:09',
    },
    {
      action: 'Output scrolls; a validation command runs and passes.',
      t: '0:18',
    },
    {
      action: `The task flips to COMPLETED; the next task flips to IN_PROGRESS.`,
      t: '0:28',
    },
    { action: 'Scroll to the commit for the finished task.', t: '0:38' },
    { action: 'Hold on the plan; two tasks now complete.', t: '0:45' },
    { action: 'Outro card.', t: '0:53' },
  ],
  dataRequirements: [
    {
      atLeast: 1,
      describe: `the hero plan's first task COMPLETED, so the tasks tab shows one finished`,
      sql: `SELECT count(*) AS value FROM tasks WHERE id = 'd0d0d0d0-0000-4000-8000-000000000101' AND status = 'COMPLETED'`,
    },
    {
      atLeast: 1,
      describe: `the hero plan's second task IN_PROGRESS, the one the live run holds open`,
      sql: `SELECT count(*) AS value FROM tasks WHERE id = 'd0d0d0d0-0000-4000-8000-000000000102' AND status = 'IN_PROGRESS'`,
    },
    {
      atLeast: 1,
      describe: `the hero plan's third task PENDING, still waiting its turn`,
      sql: `SELECT count(*) AS value FROM tasks WHERE id = 'd0d0d0d0-0000-4000-8000-000000000103' AND status = 'PENDING'`,
    },
    {
      atLeast: 1,
      describe: `a passing test run in the hero output, the validation beat`,
      sql: `SELECT count(*) AS value FROM plan_output_stream WHERE plan_id = 'd0d0d0d0-0000-4000-8000-000000000001' AND content LIKE 'PASS bucket.test.ts%'`,
    },
    {
      atLeast: 1,
      describe: `a clean lint run in the hero output, the second half of validation`,
      sql: `SELECT count(*) AS value FROM plan_output_stream WHERE plan_id = 'd0d0d0d0-0000-4000-8000-000000000001' AND content LIKE '$ pnpm lint%clean'`,
    },
    {
      atLeast: 1,
      describe: `the first task's COMPLETED line in the hero output, the close the log shows`,
      sql: `SELECT count(*) AS value FROM plan_output_stream WHERE plan_id = 'd0d0d0d0-0000-4000-8000-000000000001' AND content LIKE 'Task 1/3%COMPLETED'`,
    },
    {
      atLeast: 1,
      describe: `the next task's IN_PROGRESS line in the hero output, the open the log shows`,
      sql: `SELECT count(*) AS value FROM plan_output_stream WHERE plan_id = 'd0d0d0d0-0000-4000-8000-000000000001' AND content LIKE 'Task 2/3%IN_PROGRESS'`,
    },
    {
      atLeast: 1,
      describe: `the commit line for the finished task in the hero output`,
      sql: `SELECT count(*) AS value FROM plan_output_stream WHERE plan_id = 'd0d0d0d0-0000-4000-8000-000000000001' AND content LIKE 'Committed 4f2a1c8%'`,
    },
  ],
  format: 'short',
  id: '11-ralph-one-task',
  production: {
    blockedOn: [],
    recording: 'replay',
    titleCard: ['Ralph runs a plan', 'one task at a time'],
  },
  release: { order: 5, playlist: 'execution', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        [
          '0:00',
          'One task in progress. Not three. That is the whole discipline.',
        ],
        [
          '0:09',
          'Ralph takes the lowest task that is not done, and works only that one.',
        ],
        ['0:18', 'It does the work, then it validates. Tests, then lint.'],
        [
          '0:28',
          'Only when that passes does the task close and the next one open.',
        ],
        ['0:38', 'Each task gets its own commit.'],
        [
          '0:45',
          'So a failure costs you one task, not an afternoon of tangled changes.',
        ],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'ai agents',
      'coding agents',
      'automation',
      'developer tools',
    ],
    title: 'Ralph — run a plan one task at a time',
  },
};
