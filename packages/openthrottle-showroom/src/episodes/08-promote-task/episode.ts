/**
 * @description Episode 08-promote-task — Promote a task into its own plan
 *
 * Migrated verbatim from `docs/marketing/scripts/08-promote-task.md`, then
 * corrected against the app (2026-08): promotion is a queued job with no
 * navigation, and the original task keeps a plain-text provenance note plus a
 * `promoted` tag — not a clickable link. The original 0:21/0:31/0:41 beats
 * described that nonexistent link UI; these describe what ships. See the audit
 * notes in `./flow.ts`.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action:
        'Task detail open on a seeded task whose description has visibly outgrown one task.',
      t: '0:00',
    },
    { action: 'Scroll the long description.', t: '0:08' },
    {
      action:
        'Click **Promote to Plan** in the task toolbar; confirm in the dialog; the queued toast shows.',
      t: '0:16',
    },
    {
      action:
        "Cut to `/plans`; the new plan is the top row. Open it — the task's title and description carried over.",
      t: '0:21',
    },
    {
      action:
        'Back on the original task: SKIPPED, tagged `promoted`, with a note naming the new plan.',
      t: '0:31',
    },
    { action: 'Highlight the provenance note.', t: '0:41' },
    {
      action:
        'Open the new plan\'s tasks: the seed task "Break down and scope this plan" is already waiting.',
      t: '0:48',
    },
    { action: 'Outro card.', t: '0:54' },
  ],
  format: 'short',
  id: '08-promote-task',
  production: {
    blockedOn: [
      'The task toolbar is not rendered — TaskDetailRoute hard-codes `const showToolbar = false`, the same switch PlanDetailRoute carries — so Promote to plan, which is the whole episode, is absent from the page',
    ],
    recording: 'live',
    titleCard: ['Promote a task', 'into a plan'],
  },
  release: { order: 15, playlist: 'planning-substrate', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'This started as one task. It is clearly five.'],
        [
          '0:08',
          'It happens on every project. You scoped it small and it was not small.',
        ],
        ['0:16', 'So promote it.'],
        [
          '0:21',
          'The task becomes a plan. Title, description, everything comes with it.',
        ],
        [
          '0:31',
          'And the original task keeps a record of where the work went.',
        ],
        ['0:41', 'Nothing is lost and nothing is duplicated.'],
        ['0:48', 'Now break it down properly.'],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'ai agents',
      'project planning',
      'developer tools',
      'open source',
    ],
    title: 'Promote a task into its own plan',
  },
};
