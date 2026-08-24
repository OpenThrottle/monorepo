/**
 * @description Flow for `docs/marketing/scripts/05-connect-ot-mcp.md`.
 *
 * Transcribed from that script's on-screen-action column, beat for beat. If the
 * script changes, change this; if this needs a step the script does not describe,
 * the script is wrong.
 *
 * The first flow in the season whose subject is not the app. Six of eight beats are
 * a command line, so they run against typeset surfaces (`../surfaces/shell.ts`)
 * staged in the recording browser rather than against a page — the recorder decision
 * in `../spike/README.md` stands, and this is the browser-side answer to it. The
 * text on those surfaces is real DOM, so the per-beat dump gates them exactly as it
 * gates an app page.
 *
 * Only the payoff is the product, and it is the beat everything else exists to set
 * up: `/plans` with a plan at the top that nobody typed in.
 */

import {
  CONNECT_OT_MCP_COMMANDS,
  CONNECT_OT_MCP_SURFACES,
} from '../surfaces/connect-ot-mcp';
import {
  dwell,
  highlight,
  navigate,
  press,
  reveal,
  scrollTo,
  stage,
  type_,
  waitFor,
} from '../runner/types';
import type { DemoFlow } from '../runner/types';

export const flow: DemoFlow = {
  id: '05-connect-ot-mcp',
  // A shell window is deliberately narrower than the viewport and its type is sized
  // for a phone, so the per-beat crop reads well — unlike 03, whose plans table is
  // wider than the crop window. The payoff beat is the exception and is handled by
  // pointing its region of interest at the table, which the crop then centres on.
  portraitStrategy: 'crop',
  regionOfInterest: {
    ask: '#ask',
    copy: '#setup-claude-command',
    payoff: '[data-testid="PlansTable"]',
    print: '#setup-output',
    register: '#register',
    reply: '#ask-output',
    restart: '#shell-banner',
    wiring: '#setup',
  },
  steps: [
    // 0:00 — the terminal, and the command that prints the wiring.
    stage('terminal', 'wiring'),
    waitFor('#setup-command'),
    dwell(600),
    type_('#setup-command', CONNECT_OT_MCP_COMMANDS.setupCommand, 'wiring'),
    press('Enter'),
    dwell(300),

    // 0:00 — the printed block. Long, so it gets the dwell to be read rather than
    // glimpsed; the narration is still on "here is the wiring" while it lands.
    reveal('#setup-output', 'print'),
    dwell(2_600),

    // 0:09 — the line the viewer is told to copy. Highlighted rather than merely
    // dwelt on, because the printed block covers two clients and only one of them is
    // this short's subject.
    highlight('#setup-claude-command', 1_800, 'copy'),
    dwell(1_200),

    // 0:15 — run it. The typed string IS the highlighted one: both come from
    // `buildPayloads(...).claudeCommand`, so "copy it" and "run it" cannot disagree.
    reveal('#register', 'register'),
    scrollTo('#register'),
    type_(
      '#register-command',
      CONNECT_OT_MCP_COMMANDS.registerCommand,
      'register',
    ),
    press('Enter'),
    reveal('#register-output'),
    dwell(1_800),

    // 0:24 — restart the agent, in the same shell.
    reveal('#restart', 'restart'),
    scrollTo('#restart'),
    type_('#restart-command', CONNECT_OT_MCP_COMMANDS.restartCommand),
    press('Enter'),
    dwell(400),
    // The CLI takes over the terminal, and the cut is what sells that the restart
    // happened. Its banner carries the `openthrottle-mcp ✔ connected` line the
    // narration ("servers only load at startup") is pointing at.
    stage('agent', 'restart'),
    waitFor('#shell-banner'),
    dwell(1_600),

    // 0:31 — ask it for a plan.
    type_('#ask-command', CONNECT_OT_MCP_COMMANDS.agentPrompt, 'ask'),
    press('Enter'),
    dwell(500),

    // 0:39 — it reports the plan it wrote. Built from the fixture, so the id and the
    // task titles here are the ones the browser is about to show.
    reveal('#ask-output', 'reply'),
    dwell(2_200),

    // 0:44 — the payoff, and the only beat that is the product. The plan is at the
    // top because it is the newest in the fixture and /plans orders createdAt DESC.
    navigate('/plans', 'payoff'),
    waitFor('[data-testid="PlansTable"]'),
    dwell(800),
    highlight('[data-testid="PlansTable"] tbody tr:first-child', 2_000),
    dwell(2_400),
  ],
  surfaces: CONNECT_OT_MCP_SURFACES,
  title: 'Connect OpenThrottle to Claude Code in 60 seconds',
};
