/**
 * @description Episode 14-scheduled-runs — Scheduled agent runs — put work on a cron
 *
 * Migrated verbatim from `docs/marketing/scripts/14-scheduled-runs.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * **Replay** for the run-history half: the completed run the flow opens at 0:38 is
 * seeded, not produced during the take.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action:
        '`/schedule` with seeded jobs listed, one showing a last-run time.',
      t: '0:00',
    },
    { action: 'Click **New job**; pick a plan from the picker.', t: '0:08' },
    {
      action:
        'Set the schedule with the cron toolbar; the human-readable summary updates.',
      t: '0:16',
    },
    { action: 'Choose the repository checkout for the job.', t: '0:26' },
    { action: 'Save; the job appears in the list, enabled.', t: '0:34' },
    {
      action: 'Open a seeded past run → run detail with output and token cost.',
      t: '0:40',
    },
    { action: 'Hold on the run detail.', t: '0:50' },
    { action: 'Outro card.', t: '0:55' },
  ],
  format: 'short',
  id: '14-scheduled-runs',
  production: {
    blockedOn: [],
    recording: 'replay',
    titleCard: ['Put agent work', 'on a cron'],
  },
  release: { order: 14, playlist: 'execution', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'These ran last night. Nobody was awake for any of them.'],
        ['0:08', 'A scheduled job is a plan plus a time.'],
        ['0:16', 'Pick when. It tells you in plain words what you just chose.'],
        ['0:26', 'Point it at a checkout, so it knows where the code is.'],
        ['0:34', 'Save, and it is on the clock.'],
        ['0:40', 'Each run keeps its output, its model, and what it cost.'],
        [
          '0:50',
          'So the boring work happens overnight and you read it with coffee.',
        ],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'automation',
      'cron',
      'ai agents',
      'developer tools',
    ],
    title: 'Scheduled agent runs — put work on a cron',
  },
};
