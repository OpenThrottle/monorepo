/**
 * @description Episode 10-notes — Notes — capture context your agents can actually find
 *
 * Migrated verbatim from `docs/marketing/scripts/10-notes.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 *
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action: 'A note open showing a hard-won gotcha about a migration.',
      t: '0:00',
    },
    { action: 'Navigate to `/notes/create`; type a title.', t: '0:08' },
    { action: 'Type two sentences of body text.', t: '0:18' },
    { action: 'Save; the note appears in the list.', t: '0:27' },
    {
      action: 'Navigate to `/search`; search the symptom, not the title.',
      t: '0:32',
    },
    { action: 'The note comes back as a result.', t: '0:41' },
    { action: 'Hold on the result.', t: '0:50' },
    { action: 'Outro card.', t: '0:55' },
  ],
  format: 'short',
  id: '10-notes',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['Notes your agents', 'can find'],
  },
  release: { order: 16, playlist: 'planning-substrate', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        ['0:00', 'Somebody lost an afternoon to this. Now nobody has to.'],
        [
          '0:08',
          'A note is just the thing you would have put in a Slack message and lost.',
        ],
        ['0:18', 'Write what broke and what fixed it. That is enough.'],
        ['0:27', 'Save it.'],
        ['0:32', 'Then search for the symptom, months later.'],
        [
          '0:41',
          'There it is. And your agents query the same index before they start work.',
        ],
        ['0:50', 'So the fix gets found once, not every time.'],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'ai agents',
      'knowledge base',
      'developer tools',
      'open source',
    ],
    title: 'Notes — capture context your agents can actually find',
  },
};
