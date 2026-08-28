/**
 * @description Post-install setup orchestration for the PRIMARY checkout —
 * everything ./scripts/setup.sh runs after the POSIX pre-install bootstrap
 * (skills sync, toolchain preflight, pnpm install) has completed. Each step
 * gets a heading, timing, and a clear failure banner instead of raw `set -e`
 * death.
 *
 * Step order matters:
 *   - check:bootstrap-secrets must run AFTER both bootstrap scripts — the
 *     service-account script writes the 2 token keys and the default-user
 *     script writes the 4 URL/user keys; only then is the full set present.
 *   - database:bootstrap-default-user is primary-checkout-only; worktrees
 *     share this Postgres and must NOT re-seed (they use setup_worktree).
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { createLogger } from './lib/index.ts';
import { isLinkedWorktree } from './lib/git.ts';
import { interactiveConfirm, resetEnvironmentFiles } from './setup_environment.ts'; // prettier-ignore

const logger = createLogger();

export interface SetupStep {
  args: string[];
  command: string;
  title: string;
}

/**
 * The post-install step plan, as data so the sequence is unit-testable
 * without executing anything. Order is load-bearing — see the module doc.
 */
export const buildSetupSteps = (): SetupStep[] => [
  { args: ['run', 'build'], command: 'pnpm', title: 'Build the packages' },
  { args: ['run', 'database:build'], command: 'pnpm', title: 'Build the database image' }, // prettier-ignore
  { args: ['run', 'database:start'], command: 'pnpm', title: 'Start Postgres + Redis' }, // prettier-ignore
  { args: ['run', 'database:migrate'], command: 'pnpm', title: 'Apply database migrations' }, // prettier-ignore
  { args: ['run', 'database:bootstrap-service-accounts'], command: 'pnpm', title: 'Bootstrap service accounts' }, // prettier-ignore
  { args: ['run', 'database:import-agent-assets'], command: 'pnpm', title: 'Import agent assets' }, // prettier-ignore
  { args: ['run', 'database:bootstrap-default-user'], command: 'pnpm', title: 'Seed the default login user' }, // prettier-ignore
  { args: ['run', 'check:bootstrap-secrets'], command: 'pnpm', title: 'Verify bootstrap secrets' }, // prettier-ignore
];

/** Run one step streaming to the terminal; false (after a banner) on failure. */
const runStep = (step: SetupStep): boolean => {
  logger.heading(step.title);
  logger.detail(`${step.command} ${step.args.join(' ')}`);

  const startedAt = Date.now();
  const outcome = spawnSync(step.command, step.args, { stdio: 'inherit' });
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (outcome.error || outcome.status !== 0) {
    logger.fail(`${step.title} failed after ${seconds}s${outcome.error ? ` (${outcome.error.message})` : ''}`); // prettier-ignore

    return false;
  }

  logger.success(`${step.title} (${seconds}s)`);

  return true;
};

/** The closing instructions the shell version printed as a banner block. */
const outro = (): void => {
  logger.blank();
  logger.heading('setup complete 👀');
  logger.info("Now copy 'OPENTHROTTLE_MCP_AUTH_TOKEN' and 'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN'"); // prettier-ignore
  logger.info("from your local '.bootstrap-secrets.local' and replace the values in:"); // prettier-ignore
  logger.blank();
  logger.info(' - .env');
  logger.info(' - applications/openthrottle-server/.env');
  logger.blank();
  logger.info("And lastly run 'pnpm run setup:mcp-instructions' to get the");
  logger.info('OpenThrottle MCP server installed globally.');
  logger.blank();
};

const main = async (): Promise<void> => {
  // setup is a primary-checkout flow: worktrees share the primary's Postgres
  // and must never re-seed it — they provision via setup_worktree instead.
  if (isLinkedWorktree()) {
    logger.fail('setup runs on the primary checkout only — this is a linked worktree.'); // prettier-ignore
    logger.detail('Provision worktrees with: pnpm run worktree:new <name> (or pnpm run worktree:heal)'); // prettier-ignore
    process.exit(1);
  }

  logger.heading('Environment files 🔐');
  await resetEnvironmentFiles(process.cwd(), interactiveConfirm);

  for (const step of buildSetupSteps()) {
    if (!runStep(step)) {
      process.exit(1);
    }
  }

  outro();
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
