/**
 * @description The typeset terminal video 02 puts on camera: `./scripts/setup.sh`
 * bringing the stack up, then `pnpm run start` booting it.
 *
 * The script's original action column asked for a split frame — terminal left,
 * browser right. The recorder is a single chromium page (see `../../surfaces/shell.ts`
 * on why), so the flow does what 05 settled instead: the terminal is a typeset
 * surface for the first two thirds, and the cut to the real dashboard at 0:39 IS the
 * payoff — the browser does not need to sit black in frame for half a minute to
 * make it land.
 *
 * The output here is an abridged transcript of what those commands really print —
 * the setup banner is `scripts/setup.sh`'s own, the boot line is `main.ts`'s own
 * `🚀 Application is running on:` with the real default ports (server 6021,
 * developer 6020, postgres 6010, redis 6011 — `.env.default` in each app). Abridged
 * because the real setup run prints minutes of scrollback; every line kept is one
 * the narration points at. Nothing here names a real machine: the cwd is
 * `DEMO_MACHINE.shellPrompt` and the seeded user is the fixture's fictional one.
 */

import { DEMO_MACHINE, DEMO_USER } from '../../fixtures/demo-content';
import { shellSurface } from '../../surfaces/shell';

/**
 * `setup.sh`'s opening banner, verbatim from the script's own echo lines.
 */
const setupIntro = [
  '🤖 setup.sh',
  '',
  'This script stitches together various scripts for both setup and',
  'day-to-day maintenance of the monorepo.',
  '',
  '- 🛟 setup_troubleshooting.sh',
  '- 🔐 setup_environment.sh',
  '- 💽 setup_software.sh',
].join('\n');

/**
 * The docker compose + migration stretch the 0:08 narration points at. The
 * container names and ports are the repo's real compose defaults.
 */
const setupDocker = [
  '💽 setup_software.sh',
  '',
  '[+] Running 3/3',
  ' ✔ Network openthrottle_default      Created',
  ' ✔ Container openthrottle-postgres   Started  (localhost:6010)',
  ' ✔ Container openthrottle-redis      Started  (localhost:6011)',
  '',
  'Applying database migrations…',
  '  92 applied, 0 pending — schema is current.',
].join('\n');

/** The seeded-login line the 0:18 narration points at. */
const setupSeed = [
  `👤 Seeded login user ${DEMO_USER.email}`,
  '   Password is in your local .env — you can sign in immediately.',
  '',
  '✅ setup.sh finished.',
].join('\n');

/**
 * `pnpm run start` — the root script really is
 * `start:docker && pnpm install && start:openthrottle`, and the API line is the
 * server's real startup log. The API line gets its own part so the 0:31 beat can
 * highlight the port the narration is talking about.
 */
const bootIntro = [
  '> openthrottle@ start',
  '> pnpm run start:docker && pnpm install && pnpm run start:openthrottle',
  '',
  '[+] Running 2/2',
  ' ✔ Container openthrottle-postgres   Healthy',
  ' ✔ Container openthrottle-redis      Healthy',
  '',
  '> nx run openthrottle-server:start',
].join('\n');

const bootApi = `  🚀 Application is running on: http://localhost:6021/graphql`;

const bootDeveloper = [
  '> nx run openthrottle-developer:start',
  '',
  '  ➜  openthrottle-developer ready on http://localhost:6020',
].join('\n');

export const ONE_COMMAND_BOOT_SURFACES: Readonly<Record<string, string>> = {
  /**
   * One scrollback, two commands. The setup output arrives in three staged parts
   * because that is how a long script prints — and because each part is a beat: the
   * compose lines at 0:08, the seeded user at 0:18.
   */
  terminal: shellSurface({
    blocks: [
      {
        id: 'setup',
        output: [
          { id: 'setup-intro', text: setupIntro },
          { hidden: true, id: 'setup-docker', text: setupDocker },
          { hidden: true, id: 'setup-seed', text: setupSeed },
        ],
        outputHidden: true,
      },
      {
        hidden: true,
        id: 'boot',
        output: [
          { id: 'boot-intro', text: bootIntro },
          { hidden: true, id: 'boot-api', text: bootApi },
          { hidden: true, id: 'boot-developer', text: bootDeveloper },
        ],
        outputHidden: true,
      },
    ],
    cwd: DEMO_MACHINE.shellPrompt,
    title: DEMO_MACHINE.shellPrompt,
  }),
};

/**
 * @public The exact strings the flow types.
 *
 * Exported so the flow does not carry a second copy of the two commands the whole
 * short is about.
 */
export const ONE_COMMAND_BOOT_COMMANDS = {
  setupCommand: './scripts/setup.sh',
  startCommand: 'pnpm run start',
} as const;
