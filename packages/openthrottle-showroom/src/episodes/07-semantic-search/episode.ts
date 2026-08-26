/**
 * @description Episode 07-semantic-search — Semantic search across every plan you have ever written
 *
 * Migrated verbatim from `docs/marketing/scripts/07-semantic-search.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * **BLOCKED.** Recording this flow found that `/search` — and `/search?q=…` —
 * redirects to `/dashboard` in a production build, reproducibly, for a fully
 * permissioned user. There is also no Search item in the sidebar. Search today is the
 * header ⌘K commander, which is a different UX from the one this script describes
 * (a results page with per-result match reasons and pagination).
 *
 * Two options, and this script cannot be recorded until one is taken: fix the
 * `/search` route, or rewrite the script around the commander. Do not record it
 * against the commander while the narration still describes a results page.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action:
        '`/search` open with results already on screen for `rate limiting`.',
      t: '0:00',
    },
    { action: 'Clear the field; type `how did we handle retries`.', t: '0:08' },
    {
      action:
        'Results render — plans, tasks and notes, none of which contain that phrase.',
      t: '0:18',
    },
    { action: 'Hover the top result; the match reason shows.', t: '0:27' },
    {
      action: 'Click the top result → the plan from months ago opens.',
      t: '0:36',
    },
    { action: 'Hold on the plan description.', t: '0:46' },
    { action: 'Outro card.', t: '0:54' },
  ],
  format: 'short',
  id: '07-semantic-search',
  production: {
    blockedOn: [
      'The /search route is unreachable in a production build (it redirects to /dashboard)',
    ],
    recording: 'live',
    titleCard: ['Search every plan', 'you ever wrote'],
  },
  release: { order: 9, playlist: 'planning-substrate', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        [
          '0:00',
          'Two years of plans. You remember solving this. You do not remember where.',
        ],
        ['0:08', 'So do not search for a title. Describe the problem.'],
        ['0:18', 'These do not share a single word with what I typed.'],
        [
          '0:27',
          'It matched on meaning. Everything you write gets embedded when you save it.',
        ],
        [
          '0:36',
          'And now you have the plan you half remembered, with what you decided and why.',
        ],
        [
          '0:46',
          'Your agents search the same index. Which is the actual point.',
        ],
      ],
    },
  ],
  youtube: {
    tags: [
      'openthrottle',
      'semantic search',
      'embeddings',
      'ai agents',
      'developer tools',
    ],
    title: 'Semantic search across every plan you have ever written',
  },
};
