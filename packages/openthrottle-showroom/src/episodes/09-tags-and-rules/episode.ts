/**
 * @description Episode 09-tags-and-rules — Tags and rules — automate what happens when work gets labelled
 *
 * Migrated verbatim from `docs/marketing/scripts/09-tags-and-rules.md`. The prose below is
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
        'Plan detail; add the tag `needs-review` to the plan; a rule fires and a toast shows.',
      t: '0:00',
    },
    { action: 'Navigate to `/rules`; the rule list is visible.', t: '0:09' },
    { action: 'Open the rule that just fired.', t: '0:16' },
    { action: 'Click **New rule**; pick a tag; pick an action.', t: '0:25' },
    { action: 'Save; the rule appears in the list, enabled.', t: '0:35' },
    { action: 'Back to a plan; add the tag; the new rule fires.', t: '0:42' },
    { action: 'Hold on the rule-applications list.', t: '0:50' },
    { action: 'Outro card.', t: '0:55' },
  ],
  format: 'short',
  id: '09-tags-and-rules',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['Tags and rules', 'that act for you'],
  },
  release: { order: 18, playlist: 'planning-substrate', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'I added one tag. Something just happened on its own.'],
        ['0:09', 'Rules watch for labels and then do something about them.'],
        [
          '0:16',
          'This is the one that fired. When a plan gets that tag, run this.',
        ],
        [
          '0:25',
          'Making one is two choices. The label to watch, and what to do.',
        ],
        ['0:35', 'Save it and it is live.'],
        [
          '0:42',
          'Now every plan that gets labelled this way gets handled the same way.',
        ],
        ['0:50', 'And you can see exactly what it did.'],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'automation',
      'ai agents',
      'developer tools',
      'open source',
    ],
    title: 'Tags and rules — automate what happens when work gets labelled',
  },
};
