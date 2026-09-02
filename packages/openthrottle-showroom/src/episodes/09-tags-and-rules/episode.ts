/**
 * @description Episode 09-tags-and-rules — Tags and rules — automate what happens when work gets labelled
 *
 * Migrated verbatim from `docs/marketing/scripts/09-tags-and-rules.md`, then
 * corrected against the app (2026-08): a fired rule produces NO client-side
 * feedback — no toast, and the rule-applications list is commented out of the
 * plan page — so the effect is shown by re-opening the plan, where the injected
 * task now sits. The original "a toast shows" and "rule-applications list" beats
 * described UI that does not exist. See the audit notes in `./flow.ts`.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action:
        'Plan detail; add the tag `needs-review`; re-open the plan — the seeded rule has injected a review task.',
      t: '0:00',
    },
    { action: 'Navigate to `/rules`; the rule list is visible.', t: '0:09' },
    {
      action:
        'Open the rule that just fired (its edit form — rules have no detail page).',
      t: '0:16',
    },
    {
      action:
        'Click **New rule**; name it, toggle the tag to watch, pick the skill to inject.',
      t: '0:25',
    },
    { action: 'Save; the rule appears in the list, enabled.', t: '0:35' },
    {
      action:
        'A different plan gets the tag; re-open it — the new rule has injected its task.',
      t: '0:42',
    },
    { action: 'Hold on the injected task.', t: '0:50' },
    { action: 'Outro card.', t: '0:55' },
  ],
  dataRequirements: [
    {
      atLeast: 10,
      describe:
        'distinct plan tags, so the tag filter has something to filter by',
      sql: `SELECT count(DISTINCT tag) AS value FROM plan_tags`,
    },
    {
      atLeast: 1,
      describe:
        'a tag rule that has actually fired, so the applications list is not empty',
      sql: `SELECT count(*) AS value FROM tag_action_rules r JOIN rule_applications a ON a.rule_id = r.id`,
    },
    {
      atLeast: 5,
      describe:
        'plans carrying at least three tags, so a chip row looks lived-in',
      sql: `SELECT count(*) AS value FROM (SELECT p.id FROM plans p JOIN plan_tags pt ON pt.plan_id = p.id GROUP BY p.id HAVING count(DISTINCT pt.tag) >= 3) x`,
    },
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
