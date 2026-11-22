/**
 * @description Flow for episode `L2-setup-from-scratch` (`./episode.ts`).
 *
 * Transcribed from the episode's beat actions, beat for beat. If the episode
 * changes, change this; if this needs a step the episode does not describe, the
 * episode is wrong.
 *
 * ## Why this flow does not compose the shorts' flows
 *
 * L2 is, in effect, 02-one-command-boot + 05-connect-ot-mcp + a first plan, and the
 * obvious move is to export each short's step sequence and concatenate them, so the
 * long video could not drift from the shorts. That is not sound, for four reasons
 * that are each mechanical rather than a matter of taste:
 *
 * 1. **`stage` replaces the whole document** (`page.setContent`). Each short's
 *    sequence opens by staging its own empty terminal, so concatenating them makes
 *    every segment start from a blank scrollback. L2's picture is one terminal that
 *    fills from an empty prompt to a running stack ("hard cut to an empty
 *    terminal" is beat 1 only), and the commands before 02's — versions, clone,
 *    install — have no short at all.
 * 2. **Surface keys collide.** `02` and `05` both call their surface `terminal`
 *    and `03` and `05` both call theirs `agent`; `DemoFlow.surfaces` is one flat
 *    record, so the second would silently overwrite the first.
 * 3. **The shorts' dwells are pacing for a 55-second video.** Beats here are 30 to
 *    50 seconds. Rescaling every dwell in a borrowed sequence is a transform no
 *    reader can check by eye, which is the thing composition was supposed to buy.
 * 4. **02's terminal text is not safe to inherit.** Checked against the repo on
 *    2026-11-22 it carries a `setup.sh` banner the script no longer prints, a
 *    `pnpm run start` header missing the `sync:skills` step, an invented
 *    `92 applied` migration count and container names without Compose's `-1`
 *    suffix. A 10-minute video built on it would repeat those; this one reads the
 *    migration ledger from the repo instead. (02 is left as it is — it is a
 *    short, and not this change's to fix.)
 *
 * What IS shared is the text: `05-connect-ot-mcp/surface.ts` exports
 * `CONNECT_OT_MCP_TEXT` (the printed instructions, the register command, the
 * launcher path, the agent banner and reply) and the commands, so the two videos
 * cannot disagree about what `setup:mcp-instructions` prints or what the agent
 * says. The surfaces themselves live in `./surface.ts`, with a note on what each
 * piece of text is.
 *
 * ## Beats the episode changed to be true
 *
 * - **Sign-in.** The login form is prefilled only in development; the recording
 *   build is production, so the flow signs out and TYPES the demo credentials
 *   (`runner/actions.ts` `signIn` does the same off-camera).
 * - **The first plan.** The web form for creating a plan was removed (#495);
 *   plans are created through the MCP server, so the "create one plan" beat became
 *   the agent writing it, after the wiring it depends on.
 * - **"Mostly empty."** The recording runs on the seeded demo workspace, which is
 *   not empty, so the dashboard beat says what a fresh install looks like and
 *   shows the demo.
 *
 * Eighteen flow beats, one fewer than the episode's nineteen, because the
 * assembler appends the outro card (`flows.test.ts` holds the count).
 *
 * ## Pacing
 *
 * The one wait the episode makes a point of is `pnpm install`. A typeset surface
 * cannot stream its real progress (nothing deterministic to show), so that beat
 * holds on the running command; the narration says it is the long wait, and the
 * dwell is the longest in the flow. The shorter waits are not stretched.
 */

import { DEMO_USER } from '../../fixtures/demo-content.ts';
import type { DemoFlow } from '../../runner/types.ts';
import {
  click,
  dwell,
  highlight,
  navigate,
  press,
  reveal,
  scrollTo,
  stage,
  type_,
  waitFor,
  waitForUrl,
} from '../../runner/types.ts';
import {
  SETUP_FROM_SCRATCH_COMMANDS as commands,
  SETUP_FROM_SCRATCH_FACTS,
  SETUP_FROM_SCRATCH_SURFACES,
} from './surface.ts';

const DASHBOARD_GRID = '[data-testid="dashboard-content-grid"]';

export const flow: DemoFlow = {
  id: 'L2-setup-from-scratch',
  // Terminal windows are narrower than the viewport and sized for a phone, so the
  // crop reads well; the dashboard beats point at the content grid.
  portraitStrategy: 'crop',
  regionOfInterest: {
    'ask-agent': '#ask',
    boot: '#start-api',
    clone: '#clone',
    containers: '#setup-docker',
    dashboard: DASHBOARD_GRID,
    finished: DASHBOARD_GRID,
    install: '#install',
    'mcp-block': '#wiring',
    migrations: '#setup-migrate',
    'postgres-down': '#db',
    prerequisites: '#node',
    register: '#register',
    'seeded-user': '#setup-seed',
    setup: '#setup',
    'sign-in': '[data-testid="OpenThrottleAuthForm"]',
    'stale-env': '#env',
    start: '#start',
    'working-dashboard': DASHBOARD_GRID,
  },
  steps: [
    // 0:00 — the finished dashboard, then a hard cut to an empty terminal.
    navigate('/dashboard', 'finished'),
    waitFor(DASHBOARD_GRID),
    dwell(2_500),
    highlight(DASHBOARD_GRID, 1_600),
    dwell(1_500),
    stage('terminal'),
    waitFor('#node-command'),
    dwell(800),

    // 0:20 — node, pnpm, docker: the three prerequisites.
    type_('#node-command', commands.node, 'prerequisites'),
    press('Enter'),
    reveal('#node-output'),
    dwell(1_500),
    reveal('#pnpm'),
    scrollTo('#pnpm'),
    type_('#pnpm-command', commands.pnpm),
    press('Enter'),
    reveal('#pnpm-output'),
    dwell(1_500),
    reveal('#docker'),
    scrollTo('#docker'),
    type_('#docker-command', commands.docker),
    press('Enter'),
    reveal('#docker-output'),
    dwell(4_000),

    // 0:50 — clone it, then step into it.
    reveal('#clone', 'clone'),
    scrollTo('#clone'),
    type_('#clone-command', commands.clone),
    press('Enter'),
    reveal('#clone-output'),
    dwell(2_000),
    reveal('#cd'),
    scrollTo('#cd'),
    type_('#cd-command', commands.enter),
    press('Enter'),
    dwell(2_500),

    // 1:20 — the long wait. See "Pacing" above: the surface cannot stream pnpm's
    // progress, so the command runs and the beat holds on it.
    reveal('#install', 'install'),
    scrollTo('#install'),
    type_('#install-command', commands.install),
    press('Enter'),
    dwell(20_000),

    // 2:10 — one script does the rest of the setup.
    reveal('#setup', 'setup'),
    scrollTo('#setup'),
    type_('#setup-command', commands.setup),
    press('Enter'),
    dwell(400),
    reveal('#setup-output'),
    dwell(6_000),

    // 2:40 — Postgres and Redis start in containers.
    reveal('#setup-docker', 'containers'),
    scrollTo('#setup-docker'),
    dwell(2_500),
    waitFor('#setup-docker'),
    highlight('#setup-docker', 2_500),
    dwell(4_000),

    // 3:20 — every migration applies; the ledger output scrolls to the end.
    reveal('#setup-migrate', 'migrations'),
    scrollTo('#setup-migrate'),
    dwell(7_000),
    reveal('#setup-migrate-tail'),
    scrollTo('#setup-migrate-tail'),
    dwell(5_000),

    // 3:50 — the seeded-user line.
    reveal('#setup-seed', 'seeded-user'),
    scrollTo('#setup-seed'),
    waitFor('#setup-seed'),
    highlight('#setup-seed', 2_000),
    dwell(3_500),

    // 4:00 — start it.
    reveal('#start', 'start'),
    scrollTo('#start'),
    type_('#start-command', commands.start),
    press('Enter'),
    reveal('#start-output'),
    dwell(3_000),

    // 4:30 — API boot output; then the developer app serves. The API line is
    // revealed second because the narration points at it; the wrapper was
    // revealed with the command, and a part inside a hidden wrapper shows nothing.
    reveal('#start-api', 'boot'),
    scrollTo('#start-api'),
    waitFor('#start-api'),
    highlight('#start-api', 1_800),
    dwell(5_000),
    reveal('#start-developer'),
    scrollTo('#start-developer'),
    dwell(8_000),

    // 5:20 — the browser, and the sign-in form. The recording build is production,
    // where the form is NOT prefilled, so sign out and type the demo credentials.
    // `/auth/logout` clears the session cookie the runner set up before capture.
    navigate('/auth/logout', 'sign-in'),
    navigate('/auth'),
    waitFor('[data-testid="OpenThrottleAuthForm"]'),
    dwell(1_500),
    // Clear before typing: a server started without NODE_ENV=production treats
    // itself as development and prefills the form, and typing would append.
    click('#auth-email'),
    press('ControlOrMeta+A'),
    press('Backspace'),
    type_('#auth-email', DEMO_USER.email),
    click('#auth-password'),
    press('ControlOrMeta+A'),
    press('Backspace'),
    type_('#auth-password', DEMO_USER.password),
    dwell(800),
    click('#auth-submit-button'),
    waitForUrl('**/dashboard'),
    waitFor(DASHBOARD_GRID),
    dwell(2_000),

    // 5:50 — the dashboard loads. This is the seeded demo workspace, not an empty
    // install; the narration says so.
    highlight(DASHBOARD_GRID, 2_000, 'dashboard'),
    dwell(6_000),

    // 6:30 — a second terminal; print the wiring.
    stage('mcp', 'mcp-block'),
    waitFor('#wiring-command'),
    dwell(300),
    type_('#wiring-command', commands.setupMcp),
    press('Enter'),
    dwell(600),
    reveal('#wiring-output'),
    dwell(4_000),
    waitFor('#wiring-claude-command'),
    highlight('#wiring-claude-command', 2_000),
    dwell(5_000),

    // 7:00 — paste it, which registers the server in the agent's user config,
    // then restart the agent. The command arrives pasted rather than typed, the
    // same way 05 does it: a 500-character JSON line is not something anyone types.
    reveal('#register', 'register'),
    scrollTo('#register'),
    dwell(3_000),
    press('Enter'),
    reveal('#register-output'),
    dwell(4_000),
    reveal('#restart'),
    scrollTo('#restart'),
    type_('#restart-command', commands.restart),
    press('Enter'),
    dwell(400),
    stage('agent'),
    waitFor('#shell-banner'),
    dwell(5_000),

    // 7:30 — ask the agent for a plan; it reports the plan it wrote, and the
    // dashboard shows it at the top of Plans.
    type_('#ask-command', SETUP_FROM_SCRATCH_FACTS.agentPrompt, 'ask-agent'),
    press('Enter'),
    dwell(3_000),
    reveal('#ask-output'),
    dwell(6_000),
    navigate('/plans'),
    waitFor('[data-testid="PlansTable"]'),
    dwell(800),
    highlight('[data-testid="PlansTable"] tbody tr:first-child', 2_500),
    dwell(5_000),

    // 8:00 — the first thing that goes wrong: the database is not running.
    stage('trouble', 'postgres-down'),
    waitFor('#db-command'),
    dwell(600),
    type_('#db-command', commands.serverDev),
    press('Enter'),
    reveal('#db-output'),
    waitFor('#db-error'),
    highlight('#db-error', 2_500),
    dwell(4_000),
    reveal('#dbfix'),
    scrollTo('#dbfix'),
    type_('#dbfix-command', commands.databaseStart),
    press('Enter'),
    reveal('#dbfix-output'),
    dwell(5_000),

    // 8:40 — the second: the environment file has no token for the MCP launcher.
    reveal('#env', 'stale-env'),
    scrollTo('#env'),
    type_('#env-command', commands.staleLauncher),
    press('Enter'),
    reveal('#env-output'),
    waitFor('#env-fix'),
    highlight('#env-fix', 2_500),
    dwell(6_000),

    // 9:20 — back to the working dashboard.
    navigate('/dashboard', 'working-dashboard'),
    waitFor(DASHBOARD_GRID),
    dwell(2_000),
    highlight(DASHBOARD_GRID, 2_000),
    dwell(4_000),
  ],
  surfaces: SETUP_FROM_SCRATCH_SURFACES,
  title: 'Setup from scratch: clone to running in one sitting',
};
