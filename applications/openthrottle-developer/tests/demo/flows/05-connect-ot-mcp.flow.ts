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
  // One key per flow beat, and there are exactly as many flow beats as the script has
  // narration rows. See the note on the 0:00 reveal.
  regionOfInterest: {
    ask: '#ask',
    copy: '#setup-claude-command',
    payoff: '[data-testid="PlansTable"]',
    register: '#register',
    reply: '#ask-output',
    restart: '#shell-body',
    wiring: '#setup',
  },
  steps: [
    // 0:00 — the terminal, and the command that prints the wiring.
    stage('terminal', 'wiring'),
    waitFor('#setup-command'),
    // Barely a beat before typing starts. The script's action column does not ask for
    // a pause here, and the publish checklist wants the opening seconds to carry
    // something — an empty prompt with a caption over it is the empty state it warns
    // about. The time it used to take is spent on the printed block instead.
    dwell(150),
    type_('#setup-command', CONNECT_OT_MCP_COMMANDS.setupCommand, 'wiring'),
    press('Enter'),
    dwell(750),

    // Still 0:00 — the printed block. Long, so it gets the dwell to be read rather
    // than glimpsed; the narration is still on "here is the wiring" while it lands.
    // Deliberately NOT its own beat: narration beats are matched to flow beats
    // POSITIONALLY (assemble/timeline.ts), so an extra flow beat does not merely go
    // unnarrated — it shifts every later beat's narration one beat early.
    reveal('#setup-output'),
    dwell(4_700),

    // 0:09 — the line the viewer is told to copy. Highlighted rather than merely
    // dwelt on, because the printed block covers two clients and only one of them is
    // this short's subject.
    highlight('#setup-claude-command', 1_800, 'copy'),
    dwell(3_300),

    // 0:15 — run it. The command arrives pasted rather than typed: the viewer was
    // just told to copy it, and the surface pre-fills the line with the SAME string
    // the previous beat highlighted, so "copy it" and "run it" cannot disagree.
    reveal('#register', 'register'),
    scrollTo('#register'),
    dwell(3_000),
    press('Enter'),
    reveal('#register-output'),
    dwell(5_100),

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
    dwell(4_800),

    // 0:31 — ask it for a plan.
    type_('#ask-command', CONNECT_OT_MCP_COMMANDS.agentPrompt, 'ask'),
    press('Enter'),
    dwell(3_300),

    // 0:39 — it reports the plan it wrote. Built from the fixture, so the id and the
    // task titles here are the ones the browser is about to show.
    reveal('#ask-output', 'reply'),
    dwell(4_700),

    // 0:44 — the payoff, and the only beat that is the product. The plan is at the
    // top because it is the newest in the fixture and /plans orders createdAt DESC.
    navigate('/plans', 'payoff'),
    waitFor('[data-testid="PlansTable"]'),
    dwell(800),
    highlight('[data-testid="PlansTable"] tbody tr:first-child', 2_000),
    dwell(3_200),
  ],
  surfaces: CONNECT_OT_MCP_SURFACES,
  title: 'Connect OpenThrottle to Claude Code in 60 seconds',
};
