/**
 * @description Flow for episode `22-self-host-docker-compose` (`./episode.ts`).
 *
 * Transcribed from the episode's beat actions, beat for beat. If the episode
 * changes, change this; if this needs a step the episode does not describe, the
 * episode is wrong.
 *
 * Four beats are a terminal (`./surface.ts`, a typeset shell, because the recorder
 * cannot film a real one and must not start a real stack) and two are the real
 * dashboard: the opening cut, and the payoff on the served port.
 *
 * ## What is captured and what is derived
 *
 * Nothing on the terminal was recorded from a run; `./surface.ts` documents the
 * rules in full. In short:
 *
 * - **Captured (verbatim lines of the real file):** the compose excerpt at 0:09.
 *   It is the repo-root `docker-compose.yml`, read at build time, narrowed to the
 *   services of the `prod` profile (redis, postgres, migrations, server,
 *   developer, mcp).
 * - **Derived from that file:** the `docker compose --profile prod up -d` lines at
 *   0:27 (container names from the file's `name:` and service keys, order from
 *   `depends_on`, states from `healthcheck:` / the images' `HEALTHCHECK`), and the
 *   `docker compose port developer 6020` line at 0:37 (the port is
 *   `OPENTHROTTLE_DEVELOPER_PORT` in `.env.default`).
 * - **Real:** the dashboard at 0:00 and 0:37. The recording base URL stands in for
 *   "the served port".
 *
 * Six flow beats, one fewer than the episode's seven, because the assembler
 * appends the outro card (`flows.test.ts` holds the count). The flow is read-only.
 */

import type { DemoFlow } from '../../runner/types.ts';
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
} from '../../runner/types.ts';
import { SELF_HOST_COMMANDS, SELF_HOST_SURFACES } from './surface.ts';

const DASHBOARD_GRID = '[data-testid="dashboard-content-grid"]';

export const flow: DemoFlow = {
  id: '22-self-host-docker-compose',
  // The shell window is narrower than the viewport and sized for a phone, so the
  // per-beat crop reads well; the dashboard beats crop to the content grid.
  portraitStrategy: 'crop',
  regionOfInterest: {
    compose: '#compose-output',
    dashboard: '#served',
    health: '#up-output',
    hold: DASHBOARD_GRID,
    hook: DASHBOARD_GRID,
    up: '#up',
  },
  steps: [
    // 0:00 — the running dashboard, then the cut to the terminal behind it.
    navigate('/dashboard', 'hook'),
    waitFor(DASHBOARD_GRID),
    dwell(4_500),
    stage('terminal'),
    waitFor('#compose-command'),
    dwell(2_500),

    // 0:09 — open the compose file and scroll its service list.
    type_('#compose-command', SELF_HOST_COMMANDS.composeCommand, 'compose'),
    press('Enter'),
    reveal('#compose-output'),
    dwell(1_200),
    scrollTo('#compose-postgres'),
    dwell(1_600),
    scrollTo('#compose-server'),
    dwell(2_000),
    scrollTo('#compose-mcp'),
    dwell(2_400),

    // 0:19 — the one command, with the production profile.
    reveal('#up', 'up'),
    scrollTo('#up'),
    waitFor('#up-command'),
    type_('#up-command', SELF_HOST_COMMANDS.upCommand),
    press('Enter'),
    dwell(1_500),

    // 0:27 — the data stores and the one-shot migration finish first, then the apps
    // that wait on them; the narration walks that order. The wrapper is revealed
    // before the parts, because a part inside a hidden wrapper shows nothing.
    reveal('#up-output', 'health'),
    reveal('#up-data'),
    scrollTo('#up-data'),
    waitFor('#up-data'),
    highlight('#up-data', 1_800),
    dwell(2_200),
    reveal('#up-apps'),
    scrollTo('#up-apps'),
    waitFor('#up-apps'),
    highlight('#up-apps', 1_800),
    dwell(3_000),

    // 0:37 — the served port, then the real dashboard on it.
    reveal('#served', 'dashboard'),
    scrollTo('#served'),
    waitFor('#served-command'),
    type_('#served-command', SELF_HOST_COMMANDS.portCommand),
    press('Enter'),
    reveal('#served-output'),
    dwell(1_800),
    navigate('/dashboard'),
    waitFor(DASHBOARD_GRID),
    dwell(4_500),

    // 0:46 — hold. Apache two, no hosted account.
    dwell(7_500, 'hold'),
  ],
  surfaces: SELF_HOST_SURFACES,
  title: 'Self-host the whole thing on one box',
};
