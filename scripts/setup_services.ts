/**
 * @description Clone the optional sibling repositories into services/.
 *
 * 👀 The folder names we clone our repos into matter: the names and relative
 * paths are referenced and used for internal DNS resolution and should not be
 * changed from their default values (repo name).
 *
 * Every candidate repo is currently opt-in (the list ships empty — the
 * historical candidates live in the comment below, matching the commented-out
 * block the shell version carried). Primary-checkout only.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { gitOutput, isLinkedWorktree } from './lib/git.ts';
import { createLogger } from './lib/index.ts';

const logger = createLogger();

interface ServiceRepo {
  folder: string;
  remote: string;
}

// Historical candidates (kept for reference, all opt-in — uncomment to clone):
//   { folder: 'infrastructure', remote: 'git@github.com:OpenThrottle/infrastructure.git' }
//   { folder: 'openclaw', remote: 'git@github.com:openclaw/openclaw.git' }
//   { folder: 'openthrottle-github', remote: 'git@github.com:OpenThrottle/.github.git' }
const REPOSITORIES: readonly ServiceRepo[] = [];

const main = (): void => {
  if (isLinkedWorktree()) {
    logger.step('Running from a linked Git worktree — skipping clone.');

    return;
  }

  const root = process.cwd();
  const packageName = existsSync(join(root, 'package.json'))
    ? JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name
    : undefined;

  if (packageName !== 'monorepo') {
    logger.fail('setup_services must be run from the "monorepo" repository root.'); // prettier-ignore
    process.exit(1);
  }

  logger.heading('setup_services 🧩');

  if (REPOSITORIES.length === 0) {
    logger.step('no service repositories configured — nothing to clone');

    return;
  }

  for (const repo of REPOSITORIES) {
    const target = join(root, 'services', repo.folder);

    if (existsSync(target)) {
      logger.step(`already cloned: ${repo.folder}`);

      continue;
    }

    if (gitOutput(['clone', repo.remote, target]) === undefined) {
      logger.fail(`clone failed for ${repo.folder}`);
      process.exit(1);
    }

    logger.success(`cloned ${repo.folder}`);
  }

  logger.success('setup_services complete');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
