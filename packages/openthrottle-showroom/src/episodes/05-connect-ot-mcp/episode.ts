/**
 * @description Episode 05 — connecting OpenThrottle's MCP server to an agent CLI.
 *
 * The first migrated episode, and the reason the typed format exists. It shipped
 * as **five** markdown files: `05-connect-ot-mcp.md` plus `-v0` through `-v3`,
 * all carrying `release: 6`, all counted by the validator, drifting apart in
 * ways nobody could see.
 *
 * How they actually related, established by hashing rather than by reading the
 * filenames:
 *
 * - All five had a **byte-identical action column and beat times**. Only the
 *   words differed. That is why `beats` sits here and narration sits on the
 *   variants — one recording serves all four takes.
 * - The canonical file was **not** a copy of any variant. It was `-v3` with two
 *   post-copy edits: a trailing "Starting here." trimmed from the hook, and
 *   "Plan and tasks" corrected to "Plans and tasks". So `-v3` on disk was a
 *   stale copy carrying a typo the shipping cut had already fixed.
 *
 * `payoff-first` below therefore carries the **canonical** text, and the stale
 * `-v3` is not preserved as a fifth variant: it differed from the shipping take
 * by an accident, not by a thesis.
 *
 * Production notes that apply to every take:
 *
 * Terminal only, no dashboard until the payoff. Claude is the example; the
 * install is global, so it works anywhere. Narration is one spoken story split
 * across the beats, not a caption per step. The single most important beat is
 * 0:44 — the plan the agent created showing up in the UI unprompted.
 *
 * Recorded against typeset shell surfaces in the recording browser, not a screen
 * capture — see `../../surfaces/shell.ts`. The printed block and the command line
 * the viewer copies both come from `scripts/setup_mcp-instructions.ts`'s own
 * exports, rendered against a fictional `/workspace/openthrottle` root, so
 * nothing in frame is a real machine.
 */

import type { VideoEpisode } from '../types';

export const episode: VideoEpisode = {
  // The picture. Identical across all four takes — verified by hashing the action
  // column of all five source files, which produced one hash.
  beats: [
    {
      action:
        'Terminal. Run `pnpm run setup:mcp-instructions`; the printed block appears.',
      t: '0:00',
    },
    {
      action:
        'Highlight the printed `claude mcp add-json … --scope user` line.',
      t: '0:09',
    },
    {
      action:
        'Run that line in the same terminal; it confirms the server was added.',
      t: '0:15',
    },
    {
      action:
        'Restart the agent CLI; its banner shows `openthrottle-mcp` connected.',
      t: '0:24',
    },
    {
      action:
        'In the agent, type: `create a plan to add request tracing, with three tasks`.',
      t: '0:31',
    },
    {
      action: 'Agent reports the created plan id and its three tasks.',
      t: '0:39',
    },
    {
      action:
        'Switch to the browser; refresh `/plans`; the new plan is at the top with 3 tasks.',
      t: '0:44',
    },
    { action: 'Outro card.', t: '0:53' },
  ],
  format: 'short',
  id: '05-connect-ot-mcp',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['Connect it to', 'Claude Code'],
  },
  release: { order: 6, playlist: 'getting-started', status: 'draft' },
  selectedVariant: 'payoff-first',
  variants: [
    {
      id: 'payoff-first',
      narration: [
        [
          '0:00',
          'In sixty seconds your agent will be filing plans into OpenThrottle — plans it can actually run.',
        ],
        [
          '0:09',
          "Grab the line for your agent — for us today, that's Claude Code.",
        ],
        [
          '0:15',
          "Run it once and you're covered everywhere — every project, every worktree, every terminal on this machine.",
        ],
        [
          '0:24',
          'One quick restart, the banner confirms the connection, and setup is completely behind you.',
        ],
        [
          '0:31',
          'Now work like you normally would — ask your agent to plan out the next feature.',
        ],
        [
          '0:39',
          "Plans and tasks, written straight into OpenThrottle's database.",
        ],
        [
          '0:44',
          "And in the dashboard it's more than a document — tasks that run in parallel, with every run tracked.",
        ],
      ],
      pacingNotes:
        'Every cue holds 1.8–2.0 words/second so the read stays unhurried with no dead air. The hook promises executable plans up front, and the close pays it off with parallel execution and tracked runs.',
      thesis:
        'Payoff first. Promises the outcome up front — in sixty seconds your agent will be filing plans on its own — and closes on what you do with the plan next. Lowest word count of the four, so the slowest and most breathing-room delivery. Pick this one if slowing the pace is the top priority.',
    },
    {
      id: 'problem-first',
      narration: [
        [
          '0:00',
          'Agents already make plans — they just disappear into chat history. One command prints everything you need to fix that.',
        ],
        [
          '0:09',
          "We're showing Claude Code here, but every agent CLI connects the same way.",
        ],
        [
          '0:15',
          'Paste it, run it once. The user scope makes it global — every project, every worktree on your machine is covered.',
        ],
        [
          '0:24',
          "Restart your agent so the server loads, check the banner — connected. That's the whole setup.",
        ],
        [
          '0:31',
          "Now just ask for a plan in plain English — and these aren't notes, they're runnable work.",
        ],
        ['0:39', 'The plan and its tasks land in OpenThrottle, ready to run.'],
        [
          '0:44',
          'And there they are in the dashboard — agents can execute these tasks in parallel, with every run tracked.',
        ],
      ],
      pacingNotes:
        'Every cue holds 1.8–2.2 words/second. The 0:39–0:53 stretch carries the full payoff arc: real records, executable, parallel, tracked.',
      thesis:
        'Why this matters. Leads with the pain: agents already make plans, but they evaporate into chat history. Strongest hook of the four; best if the short has to earn attention in the first two seconds.',
    },
    {
      id: 'how-it-works',
      narration: [
        [
          '0:00',
          'OpenThrottle ships an MCP server, and this one command prints the exact setup for every agent CLI.',
        ],
        [
          '0:09',
          "Here's the Claude Code line — the key part is the user scope flag.",
        ],
        [
          '0:15',
          "User scope installs it once, globally — not per project. Any repo you open on this machine, it's already connected.",
        ],
        [
          '0:24',
          'Agents load MCP servers at startup, so restart once and the connection is live.',
        ],
        [
          '0:31',
          "No special syntax — just describe the plan. What you get back isn't chat output, it's database records.",
        ],
        [
          '0:39',
          'The agent writes plan and tasks into OpenThrottle, ready to execute.',
        ],
        [
          '0:44',
          "Refresh the dashboard and it's all there — rooted in your source code, executable in parallel, with every run tracked.",
        ],
      ],
      pacingNotes:
        'Every cue holds 1.9–2.2 words/second. The 0:44 line does the most connect-the-dots work of any variant: rooted in source, executable in parallel, every run tracked.',
      thesis:
        'How it works. Teaches while it demos: what the user scope is, why the restart matters, why the plan appears in the dashboard. Best for a skeptical developer audience that wants to know what is actually happening.',
    },
    {
      id: 'plainest',
      narration: [
        [
          '0:00',
          'Install the MCP globally, and from then on your agent can read and write plans wherever you work.',
        ],
        [
          '0:09',
          'Here we are showing Claude, and the others work the same way.',
        ],
        ['0:15', 'Run it once, and it works anywhere you open a project.'],
        [
          '0:24',
          'Restart the agent so the server loads, and then you are done with setup.',
        ],
        ['0:31', 'From here you just ask it for a plan.'],
        ['0:39', 'It writes the plan and the tasks straight in.'],
        [
          '0:44',
          'And there they are in the dashboard, a plan and its tasks, rooted in the actual source code.',
        ],
      ],
      thesis:
        'The plainest read, and the original. No hook device: it states what the command does and what you get. Carried no pacing notes of its own — it predates the three deliberate rewrites that followed it, and is kept as the baseline they were each trying to beat.',
    },
  ],
  youtube: {
    summary:
      'Connect the OpenThrottle MCP server to Claude Code in one command, then ask your agent for a plan and watch it land in the dashboard.',
    tags: [
      'ai agents',
      'claude code',
      'coding agents',
      'developer tools',
      'mcp',
      'open source',
      'openthrottle',
    ],
    title: 'Connect OpenThrottle to Claude Code in 60 seconds',
  },
};
