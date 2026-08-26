/**
 * @description Episode 13-plan-id-traceability — Every commit traced back to why it exists
 *
 * Migrated verbatim from `docs/marketing/scripts/13-plan-id-traceability.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * Do not read the id aloud — it is on screen. The narration says "the task id"; the
 * frame shows the footer.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action:
        "A git log in a terminal, one commit's footer visible with the plan and task ids.",
      t: '0:00',
    },
    { action: 'Zoom on the footer lines.', t: '0:07' },
    { action: 'Copy the task id.', t: '0:15' },
    { action: 'Paste into the dashboard search; the task opens.', t: '0:21' },
    {
      action: 'Task detail loads — description, status, parent plan.',
      t: '0:28',
    },
    { action: 'Click up to the plan; read the description.', t: '0:37' },
    { action: 'Hold on the plan description.', t: '0:46' },
    { action: 'Outro card.', t: '0:53' },
  ],
  format: 'short',
  id: '13-plan-id-traceability',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['Every commit,', 'traced to its task'],
  },
  release: { order: 11, playlist: 'execution', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'Look at the bottom of this commit message.'],
        [
          '0:07',
          'Two ids. The plan this came from, and the exact task inside it.',
        ],
        ['0:15', 'Every commit an agent makes carries them.'],
        ['0:21', 'So you can go the other way.'],
        [
          '0:28',
          'Here is the task. What was asked for, and what it was part of.',
        ],
        ['0:37', 'And here is the reason the work existed at all.'],
        ['0:46', 'Blame tells you who. This tells you why.'],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'git',
      'ai agents',
      'traceability',
      'developer tools',
    ],
    title: 'Every commit traced back to why it exists',
  },
};
