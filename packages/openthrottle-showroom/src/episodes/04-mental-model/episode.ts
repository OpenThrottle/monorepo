/**
 * @description Episode 04-mental-model — Plans, tasks, notes, projects — the mental model
 *
 * Migrated verbatim from `docs/marketing/scripts/04-mental-model.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * The only Season 1 short that teaches a vocabulary rather than a click-path. Risk:
 * it turns into four definitions read aloud. The action column carries the weight —
 * each term is shown, not described.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    { action: 'Plan detail open, tasks visible.', t: '0:00' },
    { action: 'Highlight the plan header.', t: '0:05' },
    { action: 'Highlight one task row.', t: '0:12' },
    { action: 'Navigate to `/notes`, open a seeded note.', t: '0:21' },
    { action: 'Navigate to `/projects`, open a seeded project.', t: '0:31' },
    {
      // The plan detail page has no project badge; the one place the app renders
      // the plan→project relation is the project link on a plan's row in /plans.
      action: "Back to `/plans`; highlight a plan row's project link.",
      t: '0:41',
    },
    { action: 'Hold on the plan.', t: '0:50' },
    { action: 'Outro card.', t: '0:54' },
  ],
  format: 'short',
  id: '04-mental-model',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['Plans, tasks,', 'notes, projects'],
  },
  release: { order: 8, playlist: 'planning-substrate', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'Four words, and then you know the whole system.'],
        ['0:05', 'A plan is a goal with an ordered list of work under it.'],
        [
          '0:12',
          'A task is one unit of that work. It has a status and exactly one owner at a time.',
        ],
        [
          '0:21',
          'A note is context. Something you learned that you want the agent to find later.',
        ],
        [
          '0:31',
          'A project is a checkout on disk. It tells the agent where the code actually is.',
        ],
        [
          '0:41',
          'Plans point at a project. Tasks live under plans. Notes are searchable by anything.',
        ],
        ['0:50', 'That is the whole vocabulary.'],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'ai agents',
      'developer tools',
      'project planning',
      'open source',
    ],
    title: 'Plans, tasks, notes, projects — the mental model',
  },
};
