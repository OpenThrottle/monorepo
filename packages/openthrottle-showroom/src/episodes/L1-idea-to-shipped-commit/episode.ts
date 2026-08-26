/**
 * @description Episode L1-idea-to-shipped-commit — OpenThrottle in 10 minutes: idea to plan to tasks to shipped commit
 *
 * Migrated verbatim from `docs/marketing/scripts/L1-idea-to-shipped-commit.md`. The prose below is
 * that file's own production notes, preserved because it is the only record of
 * why the beats are what they are.
 *
 * The flagship. Everything else on the channel is a 60-second slice of this.
 *
 * **Replay for act three.** The execution act depends on a real agent run; that run
 * is pre-baked by the demo seed and the flow drives the UI over it. Ten minutes of
 * live model calls is neither reproducible nor watchable, and a re-record would take
 * a whole afternoon of luck.
 *
 * Deliberately last in the release order despite being the flagship: it is the
 * hardest video to make and the one that most needs the pipeline to already be
 * proven on shorts.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  beats: [
    {
      action:
        'A finished plan with six completed tasks and six linked commits.',
      t: '00:00',
    },
    { action: 'Cut to an empty plans list.', t: '00:20' },
    {
      action: 'A chat with an agent, no plan, context lost mid-thread.',
      t: '00:40',
    },
    {
      action: 'Click **New plan**; type a real title and a real description.',
      t: '01:10',
    },
    { action: 'Save; plan detail, no tasks.', t: '01:50' },
    { action: 'Add the project pointing at a checkout.', t: '02:20' },
    {
      action: 'Ask the agent, over MCP, to break the plan into tasks.',
      t: '03:00',
    },
    { action: 'Tasks appear in the dashboard, ordered.', t: '03:40' },
    {
      action: "Reorder one task; rewrite another's title; delete a third.",
      t: '04:00',
    },
    {
      action: 'Start the run; the first task flips to in progress.',
      t: '04:30',
    },
    { action: 'Output streams; a validation step runs and fails.', t: '05:00' },
    {
      action: 'The agent fixes and re-validates; the task closes.',
      t: '05:40',
    },
    { action: 'The next task opens; output streams again.', t: '06:10' },
    { action: 'Fast-forward montage through the remaining tasks.', t: '07:00' },
    {
      action: 'Terminal `git log`; six commits, each with plan and task ids.',
      t: '07:30',
    },
    {
      action: 'Copy a task id; paste into search; the task opens.',
      t: '08:10',
    },
    { action: 'Up to the plan; read the original description.', t: '08:40' },
    { action: "Open the run's token usage and cost.", t: '09:20' },
    {
      action: 'Show the local model settings and the compose file.',
      t: '09:50',
    },
    { action: 'Back to the finished plan.', t: '10:20' },
    { action: 'Outro card.', t: '10:50' },
  ],
  format: 'longform',
  id: 'L1-idea-to-shipped-commit',
  production: {
    blockedOn: [],
    recording: 'replay',
    titleCard: ['OpenThrottle in 10 minutes', 'Season 1 · Episode 1'],
  },
  release: { order: 22, playlist: 'execution', status: 'draft' },
  selectedVariant: 'only',
  variants: [
    {
      id: 'only',
      narration: [
        [
          '00:00',
          'This took one afternoon, and I wrote almost none of it. Let me show you the whole loop, start to finish.',
        ],
        [
          '00:20',
          'Start here. Nothing exists yet, just an idea I have not written down.',
        ],
        [
          '00:40',
          'The problem is not that agents cannot code. It is that a chat window forgets, and you re-explain the same thing daily.',
        ],
        [
          '01:10',
          'So the first move is to write the goal down somewhere the agent can read it every time it starts.',
        ],
        ['01:50', 'That description is now the brief. Every run reads it.'],
        [
          '02:20',
          'And point it at a checkout, so the agent knows which code we mean.',
        ],
        [
          '03:00',
          'Now the breakdown. I could type six tasks. Or I can ask, since the agent already has the brief.',
        ],
        ['03:40', 'It writes them straight in. Ordered, one idea each.'],
        [
          '04:00',
          'And then I edit them, because the ordering is the part a machine gets wrong and I get right.',
        ],
        ['04:30', 'Now run it. One task at a time, lowest first.'],
        [
          '05:00',
          'It writes code, then validates. This one fails, which is the interesting case.',
        ],
        [
          '05:40',
          'It reads its own failure and fixes it. Only then does the task close.',
        ],
        [
          '06:10',
          'Then the next one. Never two at once, so a failure is always one task wide.',
        ],
        ['07:00', 'Six tasks, same loop each time.'],
        [
          '07:30',
          'Here is what came out. Six commits, each carrying the task that caused it.',
        ],
        ['08:10', 'Which means you can read the repository backwards.'],
        [
          '08:40',
          'From a line of code, to the task, to the reason the work existed.',
        ],
        [
          '09:20',
          'Every run records its model and what it cost, so this is a number and not a feeling.',
        ],
        [
          '09:50',
          'And all of it runs on your machine. Local models if you want them, self-hosted either way.',
        ],
        [
          '10:20',
          'That is the loop. Write the goal down, cut it into tasks, run them one at a time, and keep the trail.',
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
    title:
      'OpenThrottle in 10 minutes: idea to plan to tasks to shipped commit',
  },
};
