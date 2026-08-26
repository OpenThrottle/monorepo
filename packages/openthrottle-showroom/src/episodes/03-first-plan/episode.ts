/**
 * @description Episode 03-first-plan — Your first plan in 60 seconds
 *
 * Migrated verbatim from `docs/marketing/scripts/03-first-plan.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 *
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action: '`/plans` loaded with seeded plans. Click **New plan**.',
      t: '0:00',
    },
    {
      action: 'Type the title: `Add rate limiting to the public API`.',
      t: '0:06',
    },
    { action: 'Type two sentences into the description field.', t: '0:14' },
    {
      action: 'Click **Create plan** → lands on plan detail, empty task list.',
      t: '0:24',
    },
    {
      action:
        'Click **Add task**; type `Add a token bucket to the gateway`; save.',
      t: '0:31',
    },
    {
      action:
        'Add a second task the same way; the list now shows two, ordered.',
      t: '0:41',
    },
    { action: 'Hold on the two-task plan.', t: '0:49' },
    { action: 'Outro card.', t: '0:54' },
  ],
  format: 'short',
  id: '03-first-plan',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['Your first plan', 'in 60 seconds'],
  },
  release: { order: 2, playlist: 'getting-started', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'A plan is where the work lives. Here is how you make one.'],
        [
          '0:06',
          'Give it a title. Say what you want, the way you would say it to a person.',
        ],
        [
          '0:14',
          'Then the why. This is the part the agent reads before it touches anything.',
        ],
        ['0:24', 'Save it, and you get a plan with no tasks yet.'],
        [
          '0:31',
          'Add the first task. One thing, small enough to finish in a sitting.',
        ],
        ['0:41', 'Add another. They stay in the order you put them in.'],
        [
          '0:49',
          'That is it. Point an agent at this and it works top to bottom.',
        ],
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
    title: 'Your first plan in 60 seconds',
  },
};
