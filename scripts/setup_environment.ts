/**
 * @description Create/reset the local .env files from their .env.default
 * templates — the repo root plus every applications/* and packages/* folder
 * that ships a template. Interactive runs ask before resetting an existing
 * .env (default: yes); non-interactive runs (worktree provisioning, CI) take
 * the default instead of dying at EOF like the old `read -p` did under
 * `set -e`.
 *
 * Invoked through the thin scripts/setup_environment.sh shim (the path the
 * app READMEs document), imported directly by setup_worktree.ts, and run as
 * part of ./scripts/setup.sh. May run before `pnpm install`, so: node
 * builtins + scripts/lib only.
 */
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

import { createLogger } from './lib/logger.ts';

const logger = createLogger();

/** Asked once per directory whose .env already exists; true = reset it. */
export type ConfirmReset = (label: string) => Promise<boolean>;

/** The directories that may carry a .env.default: root, apps, packages. */
export const environmentDirectories = (root: string): string[] => {
  const groups = ['applications', 'packages'];
  const result = [root];

  for (const group of groups) {
    const groupDir = join(root, group);

    if (!existsSync(groupDir)) {
      continue;
    }

    for (const entry of readdirSync(groupDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        result.push(join(groupDir, entry.name));
      }
    }
  }

  return result;
};

export interface ResetOutcome {
  /** .env files newly created from a template. */
  created: string[];
  /** Existing .env files left untouched (declined, or no template). */
  kept: string[];
  /** Existing .env files reset from their template. */
  reset: string[];
}

/**
 * Walk the environment directories, creating each missing .env from its
 * .env.default and offering to reset the existing ones.
 */
export const resetEnvironmentFiles = async (
  root: string,
  confirmReset: ConfirmReset,
): Promise<ResetOutcome> => {
  const outcome: ResetOutcome = { created: [], kept: [], reset: [] };

  /* eslint-disable no-await-in-loop -- prompts are interactive; ask one directory at a time */
  for (const directory of environmentDirectories(root)) {
    const template = join(directory, '.env.default');
    const target = join(directory, '.env');
    const file = target.replace(root, '');

    if (!existsSync(template)) {
      continue;
    }

    if (!existsSync(target)) {
      copyFileSync(template, target);
      outcome.created.push(target);
      logger.success(`created ${target}`);

      continue;
    }

    if (await confirmReset(file)) {
      copyFileSync(template, target);
      outcome.reset.push(target);

      logger.success(`reset ${file}`);
    } else {
      outcome.kept.push(target);

      logger.step(`kept ${file} (left alone)\n`);
    }
  }
  /* eslint-enable no-await-in-loop */

  return outcome;
};

/**
 * Interactive confirm on a TTY (default yes, like the old `read -p`);
 * non-interactive runs KEEP the existing .env — real tokens live there, and
 * silently resetting them on a headless run would clobber a working setup
 * (the old script instead crashed at EOF). Callers that genuinely want the
 * reset-every-time behavior (worktree provisioning) pass their own confirm.
 */
export const interactiveConfirm: ConfirmReset = async (label: string) => {
  if (!process.stdin.isTTY) {
    return false;
  }

  const readline = createInterface({ input: process.stdin, output: process.stderr }); // prettier-ignore

  try {
    const answer = await readline.question(`- "${label}" exists, do you want to reset it? (y/N): `); // prettier-ignore

    return answer?.trim().toLowerCase() === 'y';
  } finally {
    readline.close();
  }
};

const main = async (): Promise<void> => {
  logger.heading('setup_environment 🔐');
  logger.detail(
    'Creates local .env files, resetting to defaults on request. \n',
  );

  await resetEnvironmentFiles(process.cwd(), interactiveConfirm);

  logger.success('setup_environment complete');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
