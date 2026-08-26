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

import type { VideoEpisode } from '../types';

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
      action:
        'The task flips to COMPLETED; the next task flips to IN_PROGRESS.',
      t: '0:28',
    },
    { action: 'Scroll to the commit for the finished task.', t: '0:38' },
    { action: 'Hold on the plan; two tasks now complete.', t: '0:45' },
    { action: 'Outro card.', t: '0:53' },
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
          'One task in progress. Not four. That is the whole discipline.',
        ],
        [
          '0:09',
          'Ralph takes the lowest task that is not done, and works only that one.',
        ],
        ['0:18', 'It does the work, then it validates. Lint, types, tests.'],
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
