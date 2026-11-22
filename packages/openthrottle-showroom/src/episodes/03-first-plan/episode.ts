/**
 * @description Episode 03-first-plan — Your first plan in 60 seconds
 *
 * Re-scripted 2026-11-22. The original beats drove the web create forms (New
 * plan, Create plan, Add task), which were removed: plans and tasks are authored
 * by an agent through the OpenThrottle MCP now. The episode shows that instead —
 * the request, the two tool calls with their arguments, and the plan that results,
 * with its tasks in order.
 *
 * Not a duplicate of 05. 05 connects the MCP server and ends on a plan nobody
 * typed; this one is about authoring, and starts with the server already
 * connected.
 *
 * What is real and what is replayed: the editor half is a typeset replay of the
 * tool calls (`./surface.ts`), because the recorder cannot make a live MCP call.
 * The tool and argument names are the real ones, and the plan the app half lands
 * on is pre-seeded — the rate-limiting hero plan 01 and 04 use, so the season
 * stays continuous. The typed title and task titles are that plan's own, verbatim.
 * The seeded plan carries run progress (one task done, one in progress) that a
 * brand-new plan would not, and the narration does not claim otherwise.
 */

import type { VideoEpisode } from '../types.ts';

export const episode: VideoEpisode = {
  beats: [
    {
      action: `Agent session. Type the request: \`plan out rate limiting for the public API, three tasks in order\`.`,
      t: '0:00',
    },
    {
      action: `The agent calls \`create_plan\`; its arguments show the title, author, category and summary.`,
      t: '0:07',
    },
    {
      action: `The call returns \`Created plan:\` and the plan id.`,
      t: '0:14',
    },
    {
      action: `The agent calls \`create_tasks\` with that plan id and three tasks in order.`,
      t: '0:19',
    },
    {
      action: `The call returns \`Created 3 tasks\` with their titles, in order.`,
      t: '0:28',
    },
    {
      action: `Switch to the browser; open the plan at \`/plans/<id>?tab=tasks\`, same title.`,
      t: '0:34',
    },
    {
      action: `Highlight the first task row, then the last; the three tasks read in order.`,
      t: '0:44',
    },
    { action: 'Outro card.', t: '0:53' },
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
        [
          '0:00',
          'Ask your agent for a plan, in plain words, the way you would ask a teammate.',
        ],
        [
          '0:07',
          'It calls create plan, with a title, an author, a category and a short summary.',
        ],
        ['0:14', 'OpenThrottle hands back the id of the new plan.'],
        [
          '0:19',
          'Then create tasks, with that id and the work in the order you want it done.',
        ],
        ['0:28', 'One call, three tasks, all or nothing.'],
        ['0:34', 'Now the app. Same title, same three tasks.'],
        [
          '0:44',
          'They keep the order the agent gave them. An agent works them top to bottom.',
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
