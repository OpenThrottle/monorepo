/**
 * @description Update the monorepo and the sibling service checkouts under
 * services/: `git pull` each repo that sits on its default branch (main or
 * master), skipping dirty/feature branches and folders in the ignore list.
 * Primary-checkout only.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { gitOutput, isLinkedWorktree } from './lib/git.ts';
import { createLogger } from './lib/index.ts';

const logger = createLogger();

/** Skip any services you might not care about, or archives. */
const IGNORED: readonly string[] = [];

/** The short branch name for a checkout, or undefined (detached, not a repo). */
const branchName = (cwd: string): string | undefined =>
  gitOutput(['symbolic-ref', '--short', 'HEAD'], cwd);

/** True when this checkout should be pulled: on one of its default branches. */
export const isPullableBranch = (
  branch: string | undefined,
  allowed: readonly string[] = ['main', 'master'],
): boolean => branch !== undefined && allowed.includes(branch);

const pull = (label: string, cwd: string, allowed: readonly string[]): void => {
  const branch = branchName(cwd);

  if (branch === undefined) {
    logger.warn(`skipping "${label}" — not a git checkout`);

    return;
  }

  if (!isPullableBranch(branch, allowed)) {
    logger.warn(`skipping "${label}" on branch "${branch}"`);

    return;
  }

  if (gitOutput(['ls-remote', '--exit-code'], cwd) === undefined) {
    logger.warn(`skipping "${label}" — remote not reachable`);

    return;
  }

  if (gitOutput(['pull', '--quiet'], cwd) === undefined) {
    logger.fail(`pull failed for "${label}"`);

    return;
  }

  logger.success(`updated "${label}"`);
};

const main = (): void => {
  if (isLinkedWorktree()) {
    logger.step('Running from a linked Git worktree — skipping update.');

    return;
  }

  const root = process.cwd();
  const packageName = existsSync(join(root, 'package.json'))
    ? JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name
    : undefined;

  if (packageName !== 'monorepo') {
    logger.fail('setup_update must be run from the "monorepo" repository root.'); // prettier-ignore
    process.exit(1);
  }

  logger.heading('setup_update 🪫');

  // The parent repo only ever pulls on main.
  pull('monorepo', root, ['main']);

  const servicesDir = join(root, 'services');

  if (!existsSync(servicesDir)) {
    logger.step('no services/ directory — nothing else to update');

    return;
  }

  for (const entry of readdirSync(servicesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (IGNORED.includes(entry.name)) {
      logger.step(`ignored "${entry.name}"`);

      continue;
    }

    pull(entry.name, join(servicesDir, entry.name), ['main', 'master']);
  }

  logger.success('setup_update complete');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
