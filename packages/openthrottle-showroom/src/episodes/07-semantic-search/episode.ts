/**
 * @description Episode 07-semantic-search — Semantic search across every plan you have ever written
 *
 * Migrated verbatim from `docs/marketing/scripts/07-semantic-search.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * **Re-checked 2026-11-21.** The August audit found `/search` redirecting to
 * `/dashboard`. That was the beta gate, and it is gone: `/search` is not in
 * `GATED_PREFIXES`, and the server embeds locally by default, so the route is
 * reachable with `FEATURE_BETA_PREVIEW` off and needs no API key. Two beats were
 * corrected to the app as it is: the corpus is plans, tasks and docs (notes are
 * not embedded), and a result's relevance is printed on its card rather than
 * revealed on hover. Checked live on 2026-11-22 against the regenerated
 * snapshot: both queries return ten results, identical across two runs.
 *
 * **Re-checked 2026-11-25.** #1014 turned the results into a table, so the
 * relevance now sits in the top row's Relevance column instead of on a card.
 */

import type { VideoEpisode } from '../types.ts';

export const episode: VideoEpisode = {
  beats: [
    {
      action: `\`/search\` open with results already on screen for \`rate limiting\`.`,
      t: '0:00',
    },
    { action: 'Clear the field; type `how did we handle retries`.', t: '0:08' },
    {
      action: `Results render — plans, tasks and docs, none of which contain that phrase.`,
      t: '0:18',
    },
    {
      action: `Hold on the top result; its relevance shows in the Relevance column.`,
      t: '0:27',
    },
    {
      action: 'Click the top result → the plan from months ago opens.',
      t: '0:36',
    },
    { action: 'Hold on the plan description.', t: '0:46' },
    { action: 'Outro card.', t: '0:54' },
  ],
  dataRequirements: [
    {
      atLeast: 25,
      describe: `plan embeddings so semantic search has a corpus to match against`,
      sql: `SELECT count(*) AS value FROM plan_embeddings`,
    },
    {
      atLeast: 100,
      describe: 'documentation embeddings, the other half of the search corpus',
      sql: `SELECT count(*) AS value FROM documentation_embeddings`,
    },
    {
      atLeast: 20,
      describe: 'plans old enough that a hit reads as months old on screen',
      sql: `SELECT count(*) AS value FROM plans WHERE deleted_at IS NULL AND created_at < now() - interval '14 days'`,
    },
  ],
  format: 'short',
  id: '07-semantic-search',
  production: {
    blockedOn: [],
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
