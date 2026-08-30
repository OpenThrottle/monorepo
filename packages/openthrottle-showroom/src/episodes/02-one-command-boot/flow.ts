/**
 * @description Flow for `docs/marketing/scripts/02-one-command-boot.md`.
 *
 * Transcribed from that script's on-screen-action column, beat for beat. If the
 * script changes, change this; if this needs a step the script does not describe,
 * the script is wrong.
 *
 * The script asked for a split frame — terminal left, browser right. The recorder
 * is one chromium page, so this does what 05 settled instead: a typeset terminal
 * surface (`./surface.ts`) carries the first five beats, and the cut to the real,
 * authenticated dashboard at 0:39 is the payoff. The episode's beat actions were
 * updated to match; see the note in `./episode.ts`.
 *
 * Seven flow beats, matching the script's seven narration rows — narration is
 * matched to flow beats POSITIONALLY (assemble/timeline.ts), so the count is a
 * contract, not a style choice.
 */

import {
  ONE_COMMAND_BOOT_COMMANDS,
  ONE_COMMAND_BOOT_SURFACES,
} from './surface';
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
} from '../../runner/types';
import type { DemoFlow } from '../../runner/types';

export const flow: DemoFlow = {
  id: '02-one-command-boot',
  // The shell window is narrower than the viewport and sized for a phone, so the
  // per-beat crop reads well. The dashboard beats point their region of interest at
  // the content grid, which the crop then centres on.
  portraitStrategy: 'crop',
  regionOfInterest: {
    boot: '#boot-api',
    compose: '#setup-docker',
    dashboard: '[data-testid="dashboard-content-grid"]',
    hold: '[data-testid="dashboard-content-grid"]',
    hook: '#setup',
    seeded: '#setup-seed',
    start: '#boot',
  },
  steps: [
    // 0:00 — an empty prompt, and the one command.
    stage('terminal', 'hook'),
    waitFor('#setup-command'),
    dwell(150),
    type_('#setup-command', ONE_COMMAND_BOOT_COMMANDS.setupCommand, 'hook'),
    press('Enter'),
    dwell(400),
    reveal('#setup-output'),
    dwell(3_000),

    // 0:08 — docker compose brings up Postgres and Redis, then the migrations run.
    reveal('#setup-docker', 'compose'),
    scrollTo('#setup-docker'),
    dwell(5_500),

    // 0:18 — the seeded-user line: no login screen with no account behind it.
    reveal('#setup-seed', 'seeded'),
    scrollTo('#setup-seed'),
    dwell(4_500),

    // 0:26 — the same terminal, the second command.
    reveal('#boot', 'start'),
    scrollTo('#boot'),
    type_('#boot-command', ONE_COMMAND_BOOT_COMMANDS.startCommand, 'start'),
    press('Enter'),
    dwell(1_200),

    // 0:31 — boot output; the API line lands and gets the highlight, because the
    // narration is pointing at exactly one port. The WRAPPER is revealed first:
    // the api/developer parts are hidden individually inside it, and revealing a
    // part inside a still-hidden wrapper shows nothing.
    reveal('#boot-output', 'boot'),
    scrollTo('#boot-intro'),
    dwell(2_200),
    reveal('#boot-api'),
    highlight('#boot-api', 1_600),
    reveal('#boot-developer'),
    scrollTo('#boot-developer'),
    dwell(2_400),

    // 0:39 — the cut that is the whole point: the real dashboard, authenticated,
    // seeded data already on screen.
    navigate('/dashboard', 'dashboard'),
    waitFor('[data-testid="dashboard-content-grid"]'),
    dwell(4_000),

    // 0:48 — hold. Everything after this point happens on your machine.
    dwell(3_500, 'hold'),
  ],
  surfaces: ONE_COMMAND_BOOT_SURFACES,
  title: '0 to 60 — boot the whole stack with one command',
};
