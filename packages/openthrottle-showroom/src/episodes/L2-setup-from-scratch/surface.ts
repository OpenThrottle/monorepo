/**
 * @description The typeset terminals video L2 puts on camera: prerequisites, clone,
 * install, `./scripts/setup.sh`, `pnpm run start`, the MCP wiring, and the two
 * things that go wrong.
 *
 * ## What is captured, and what is derived
 *
 * Nothing here is a screen recording, and nothing here is typed from memory. Every
 * piece of text is one of three things, and the doc says which.
 *
 * **Captured** (a real command run on the recording machine, 2026-11-22):
 * - `node --version` -> `v26.13.1` and `pnpm --version` -> `12.18.0`. The root
 *   `package.json` demands `node >=26` and `pnpm >=12`; the test pins that the
 *   captured values still satisfy it.
 * - `postgres-unreachable.txt`, the stdout of `scripts/ensure-migrations.ts`
 *   pointed at a port nothing listens on (`localhost:59999`). The test re-runs that
 *   exact command and fails if the output moves.
 * - The `docker ps` column header, which is what an empty `docker ps` prints.
 *   (The recording machine is not empty, so the rows are deliberately not captured:
 *   container names are the one thing in this video that could be private. The
 *   video's own premise is a machine with no containers, so the header alone is
 *   the true picture for that machine.)
 *
 * **Read from the repo at build time** (so they are true for the checkout being
 * filmed, and cannot drift):
 * - the migration ledger: one `Running: <file>` line per `.sql` file in
 *   `databases/openthrottle/migrations`, in order, and the closing
 *   `Migrations completed (N applied).` — the strings are `migration-runner.ts`'s
 *   own, and a fresh database applies every file;
 * - the registered-server text from `05-connect-ot-mcp` (`CONNECT_OT_MCP_TEXT`).
 *
 * **Derived from the repo's code, not recorded** (the strings are the real ones,
 * the arrangement is ours, and a test pins each string against the source that
 * prints it):
 * - the `setup.sh` banner and each `setup.ts` step heading and command;
 * - the Docker Compose lines. Project `openthrottle` follows from the checkout
 *   directory the clone names, the services from `docker compose up -d redis
 *   postgres`; Compose's own line format follows 22-self-host-docker-compose.
 *   Verify against the Compose version in use before publishing;
 * - the server's `🚀 Application is running on:` line (`main.ts`) and the
 *   developer app's `react-router-serve` line, localhost part only;
 * - the stale-token banner, which is `authFailBanner` in
 *   `scripts/run-openthrottle-mcp.ts`. It cannot be captured here without
 *   reading `.env`, so it is derived and pinned to the source.
 *
 * **Not shown at all, because nothing true can be shown:** `pnpm install`'s
 * progress output, the `git clone` progress lines (object counts), step timings
 * (`(12.3s)`), and the one-off `Created user …` line, which carries a database id.
 * The skipped steps of `setup.ts` (the package build and the rest) are omitted, not
 * summarised. The seeded user is the demo fixture's fictional one, not the real
 * `developer@openthrottle.ai`, because the dashboard the video cuts to is signed in
 * as that fixture user.
 *
 * Nothing names a real machine: the prompt is `DEMO_MACHINE.shellPrompt`, the
 * checkout directory is the fictional `openthrottle`, and `~` is the only home
 * reference.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEMO_MACHINE, DEMO_USER } from '../../fixtures/demo-content.ts';
import { repositoryRoot } from '../../runner/format.ts';
import { shellSurface } from '../../surfaces/shell.ts';
import {
  CONNECT_OT_MCP_COMMANDS,
  CONNECT_OT_MCP_TEXT,
} from '../05-connect-ot-mcp/surface.ts';

/** Captured on the recording machine; the test checks them against `engines`. */
const NODE_VERSION = 'v26.13.1';
const PNPM_VERSION = '12.18.0';

/** What `docker ps` prints with nothing running: the header and no rows. */
const DOCKER_PS_HEADER = `CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES`;

/** `git clone` names the target directory, so the checkout is the fictional one. */
const REPOSITORY_URL = 'https://github.com/OpenThrottle/monorepo.git';

/** The pre-`cd` prompt: home, written as `~` and never as a path. */
const HOME_PROMPT = '~ ❯';

/**
 * Real `logger.heading` + `logger.detail` shape from `scripts/utils/logger.ts`:
 * a bold `▶` heading, then the command the step runs, dimmed and indented.
 */
const stepHeading = (title: string, command: string): string => {
  return [`▶ ${title}`, '', `  ${command}`].join('\n');
};

/** `logger.success`: a check mark and the message. */
const success = (message: string): string => {
  return `✓ ${message}`;
};

const COMPOSE_PROJECT = DEMO_MACHINE.shellPrompt;
const composeNetwork = `Network ${COMPOSE_PROJECT}_default`;
const composeRedis = `Container ${COMPOSE_PROJECT}-redis-1`;
const composePostgres = `Container ${COMPOSE_PROJECT}-postgres-1`;
const composeWidth = Math.max(
  composeNetwork.length,
  composeRedis.length,
  composePostgres.length,
);

const composeLine = (name: string, state: string): string => {
  return ` ✔ ${name.padEnd(composeWidth)}  ${state}`;
};

/** `docker compose up -d redis postgres` on a machine with nothing running. */
const composeUp = [
  '[+] Running 3/3',
  composeLine(composeNetwork, 'Created'),
  composeLine(composeRedis, 'Started'),
  composeLine(composePostgres, 'Started'),
].join('\n');

/** The same command a few minutes later, when the containers are already up. */
const composeAlreadyUp = [
  '[+] Running 2/2',
  composeLine(composeRedis, 'Running'),
  composeLine(composePostgres, 'Running'),
].join('\n');

/**
 * The migration ledger, from the files themselves.
 *
 * `migration-runner.ts` logs `Running: <file>` for each pending file and then
 * `Migrations completed (N applied).`; on a fresh database every `.sql` file is
 * pending, so the list is the directory. Read at build time, which is what keeps
 * the count honest for the checkout being recorded.
 */
const migrationFiles = readdirSync(
  join(repositoryRoot(), 'databases', 'openthrottle', 'migrations'),
)
  .filter((name) => name.endsWith('.sql'))
  .sort();

/** The last stretch is its own part so the beat can scroll to it: "the ledger scrolls". */
const MIGRATION_TAIL_LINES = 12;
const migrationRunning = migrationFiles.map((file) => `Running: ${file}`);
const migrateHead = [
  'Database openthrottle (openthrottle):',
  ...migrationRunning.slice(0, -MIGRATION_TAIL_LINES),
].join('\n');
const migrateTail = [
  ...migrationRunning.slice(-MIGRATION_TAIL_LINES),
  `Migrations completed (${String(migrationFiles.length)} applied).`,
].join('\n');

const setupIntro = [
  '🤖 setup.sh — pre-install bootstrap, then tsx ./scripts/setup.ts',
  '',
  '▶ Environment files 🔐',
].join('\n');

const setupDocker = [
  stepHeading('Start Postgres + Redis', 'pnpm run database:start'),
  composeUp,
].join('\n');

const setupMigrate = [
  stepHeading('Apply database migrations', 'pnpm run database:migrate'),
  migrateHead,
].join('\n');

/**
 * `bootstrap-default-user.ts` logs one `Role <name>: assigned.` per role and then
 * `Default user ready: <email>`. The email is the fixture's, see the module doc.
 */
const setupSeed = [
  stepHeading(
    'Seed the default login user',
    'pnpm run database:bootstrap-default-user',
  ),
  success('Role admin: assigned.'),
  success('Role user: assigned.'),
  success('Role viewer: assigned.'),
  '',
  success(`Default user ready: ${DEMO_USER.email}`),
].join('\n');

const startDocker = composeAlreadyUp;
const startApi = `  🚀 Application is running on: http://localhost:6021/graphql`;
const startDeveloper = '[react-router-serve] http://localhost:6020';

const postgresUnreachable = readFileSync(
  join(import.meta.dirname, 'postgres-unreachable.txt'),
  'utf8',
).trimEnd();

/**
 * `authFailBanner` in `scripts/run-openthrottle-mcp.ts`, for the unset-token
 * reason. `Server:` is the default API address from `.env.default`.
 */
const staleEnvFail = `✗ openthrottle-mcp: refusing to start — OPENTHROTTLE_MCP_AUTH_TOKEN is unset (not in the launching env, this worktree's .env, or the root .env).`;
const staleEnvFix = [
  '  Server: http://localhost:6021',
  '  Fix:',
  '    1. Provision/verify the token:  pnpm run database:bootstrap-service-accounts',
  '    2. Set it in the root .env:      OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_<prefix>_<secret>',
  '    3. Reconnect the MCP:            /mcp reconnect   (or restart the client)',
  '  Details: packages/openthrottle-mcp/docs/AUTH.md',
].join('\n');

export const SETUP_FROM_SCRATCH_SURFACES: Readonly<Record<string, string>> = {
  /**
   * The MCP stretch's agent CLI, after the restart. Same banner and reply as 05.
   */
  agent: shellSurface({
    banner: CONNECT_OT_MCP_TEXT.agentBanner,
    blocks: [
      {
        id: 'ask',
        marker: '>',
        output: CONNECT_OT_MCP_TEXT.agentReply,
        outputHidden: true,
      },
    ],
    cwd: DEMO_MACHINE.shellPrompt,
    title: 'claude',
  }),

  /**
   * A second terminal for the MCP wiring: the first is busy running the servers,
   * which is also what a viewer following along would have open.
   */
  mcp: shellSurface({
    blocks: [
      {
        id: 'wiring',
        output: [
          { id: 'wiring-intro', text: CONNECT_OT_MCP_TEXT.printedBefore },
          {
            id: 'wiring-claude-command',
            text: CONNECT_OT_MCP_TEXT.registerCommand,
          },
          { id: 'wiring-rest', text: CONNECT_OT_MCP_TEXT.printedAfter },
        ],
        outputHidden: true,
      },
      {
        command: CONNECT_OT_MCP_TEXT.registerCommand,
        hidden: true,
        id: 'register',
        output: `Added stdio MCP server openthrottle-mcp with command: bash ${CONNECT_OT_MCP_TEXT.launcher} to user config`,
        outputHidden: true,
      },
      { hidden: true, id: 'restart' },
    ],
    cwd: DEMO_MACHINE.shellPrompt,
    title: DEMO_MACHINE.shellPrompt,
  }),

  /**
   * One scrollback from an empty prompt to a running stack. Each command is typed;
   * each output arrives in the parts the narration points at.
   */
  terminal: shellSurface({
    blocks: [
      {
        id: 'node',
        marker: HOME_PROMPT,
        output: NODE_VERSION,
        outputHidden: true,
      },
      {
        hidden: true,
        id: 'pnpm',
        marker: HOME_PROMPT,
        output: PNPM_VERSION,
        outputHidden: true,
      },
      {
        hidden: true,
        id: 'docker',
        marker: HOME_PROMPT,
        output: DOCKER_PS_HEADER,
        outputHidden: true,
      },
      {
        hidden: true,
        id: 'clone',
        marker: HOME_PROMPT,
        output: `Cloning into '${DEMO_MACHINE.shellPrompt}'...`,
        outputHidden: true,
      },
      { hidden: true, id: 'cd', marker: HOME_PROMPT },
      { hidden: true, id: 'install' },
      {
        hidden: true,
        id: 'setup',
        output: [
          { id: 'setup-intro', text: setupIntro },
          { hidden: true, id: 'setup-docker', text: setupDocker },
          { hidden: true, id: 'setup-migrate', text: setupMigrate },
          { hidden: true, id: 'setup-migrate-tail', text: migrateTail },
          { hidden: true, id: 'setup-seed', text: setupSeed },
        ],
        outputHidden: true,
      },
      {
        hidden: true,
        id: 'start',
        output: [
          { id: 'start-docker', text: startDocker },
          { hidden: true, id: 'start-api', text: startApi },
          { hidden: true, id: 'start-developer', text: startDeveloper },
        ],
        outputHidden: true,
      },
    ],
    cwd: DEMO_MACHINE.shellPrompt,
    title: DEMO_MACHINE.shellPrompt,
  }),

  /**
   * The two things that go wrong, in one window: the database is down, and the
   * token the MCP launcher needs is not in the environment file.
   */
  trouble: shellSurface({
    blocks: [
      {
        id: 'db',
        output: [{ id: 'db-error', text: postgresUnreachable }],
        outputHidden: true,
      },
      {
        hidden: true,
        id: 'dbfix',
        output: [{ id: 'dbfix-up', text: composeUp }],
        outputHidden: true,
      },
      {
        hidden: true,
        id: 'env',
        output: [
          { id: 'env-error', text: staleEnvFail },
          { id: 'env-fix', text: staleEnvFix },
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
 */
export const SETUP_FROM_SCRATCH_COMMANDS = {
  clone: `git clone ${REPOSITORY_URL} ${DEMO_MACHINE.shellPrompt}`,
  databaseStart: 'pnpm run database:start',
  docker: 'docker ps',
  enter: `cd ${DEMO_MACHINE.shellPrompt}`,
  install: 'pnpm install',
  node: 'node --version',
  pnpm: 'pnpm --version',
  restart: CONNECT_OT_MCP_COMMANDS.restartCommand,
  serverDev: 'pnpm nx run openthrottle-server:dev',
  setup: './scripts/setup.sh',
  setupMcp: CONNECT_OT_MCP_COMMANDS.setupCommand,
  staleLauncher: 'bash scripts/run-openthrottle-mcp.sh',
  start: 'pnpm run start',
} as const;

/**
 * @public Facts the tests pin against the repo; kept next to the text they
 * describe so a change to one is a change to both.
 */
export const SETUP_FROM_SCRATCH_FACTS = {
  agentPrompt: CONNECT_OT_MCP_COMMANDS.agentPrompt,
  migrationCount: migrationFiles.length,
  nodeVersion: NODE_VERSION,
  pnpmVersion: PNPM_VERSION,
  postgresUnreachable,
  staleEnvFail,
  staleEnvFix,
} as const;
