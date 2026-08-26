/**
 * @description Episode 01-what-is-openthrottle — What is OpenThrottle in 60 seconds
 *
 * Migrated verbatim from `docs/marketing/scripts/01-what-is-openthrottle.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * The channel trailer and the pilot. It has to answer "what is this" for someone who
 * has never heard the name, without a single word of setup.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action:
        'Open `/plans/<seeded-plan-id>` already loaded — plan detail, tasks visible, one IN_PROGRESS.',
      t: '0:00',
    },
    {
      action: 'Hover the task list; the IN_PROGRESS task highlights.',
      t: '0:07',
    },
    { action: 'Click the IN_PROGRESS task → task detail.', t: '0:15' },
    {
      action:
        'Back to the plan; scroll to the live output stream, already streaming.',
      t: '0:24',
    },
    {
      action:
        'Scroll the output to the commit line, which names the task it closed.',
      t: '0:33',
    },
    { action: "Back to Details; highlight the plan's description.", t: '0:41' },
    { action: 'Outro card.', t: '0:49' },
  ],
  format: 'short',
  id: '01-what-is-openthrottle',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['What is', 'OpenThrottle?'],
  },
  release: { order: 1, playlist: 'getting-started', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        [
          '0:00',
          'This is a plan. Not a markdown file in a repo somewhere. A real record, with tasks, owners and status.',
        ],
        [
          '0:07',
          'OpenThrottle gives coding agents the one thing they have never had. A place to keep the work.',
        ],
        [
          '0:15',
          'Every task has an order and a state. The agent takes the next one and finishes it before moving on.',
        ],
        [
          '0:24',
          'You watch it happen. Output streams straight out of the run while it works.',
        ],
        ['0:33', 'And when it commits, the commit says which task it closed.'],
        [
          '0:41',
          'So six months from now you can ask why a line of code exists. And actually get an answer.',
        ],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'ai agents',
      'coding agents',
      'developer tools',
      'open source',
    ],
    title: 'What is OpenThrottle in 60 seconds',
  },
};
