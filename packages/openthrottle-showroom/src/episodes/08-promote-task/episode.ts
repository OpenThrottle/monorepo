/**
 * @description Episode 08-promote-task — Promote a task into its own plan
 *
 * Migrated verbatim from `docs/marketing/scripts/08-promote-task.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 *
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
    { action: 'Click **Promote to plan** in the task toolbar.', t: '0:16' },
    {
      action:
        "The new plan opens; the task's title and description carried over.",
      t: '0:21',
    },
    {
      action:
        'Switch to the original plan; the task now shows a link to the new plan.',
      t: '0:31',
    },
    { action: 'Click through the link, back to the new plan.', t: '0:41' },
    { action: 'Add one task to the new plan.', t: '0:48' },
    { action: 'Outro card.', t: '0:54' },
  ],
  format: 'short',
  id: '08-promote-task',
  production: {
    blockedOn: [],
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
        ['0:31', 'And the original task keeps a link to where the work went.'],
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
