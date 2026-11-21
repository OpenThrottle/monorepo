#!/usr/bin/env node
/**
 * @description Create/reset the local .env files from their .env.default
 * templates — the repo root plus every applications/* and packages/* folder
 * that ships a template. Interactive runs ask before resetting an existing
 * .env (default: yes); non-interactive runs (worktree provisioning, CI) take
 * the default instead of dying at EOF like the old `read -p` did under
 * `set -e`.
 *
 * Run directly as ./scripts/setup_environment.ts (the path the app READMEs
 * document) by bare Node's native type stripping — no tsx — imported directly
 * by setup_worktree.ts, and run as part of ./scripts/setup.sh. May run before
 * `pnpm install`, so this script and everything it imports must stay
 * erasable-syntax TypeScript (no enums, namespaces or parameter properties)
 * that imports node builtins and scripts/utils only.
 */
import { randomBytes } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

import { createLogger } from './utils/logger.ts';

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

/** Template keys that hold a locally generated secret when the template ships them empty. */
const GENERATED_SECRET_KEYS = ['WEBHOOK_SECRET_ENCRYPTION_KEY'] as const;

/**
 * Copy a .env.default over its .env, filling each empty generated-secret key (see
 * {@link GENERATED_SECRET_KEYS}) with 32 fresh random bytes, base64. A template line that already
 * carries a value is left alone.
 */
export const copyEnvironmentTemplate = (
  template: string,
  target: string,
): void => {
  copyFileSync(template, target);

  let contents = readFileSync(target, 'utf8');

  for (const key of GENERATED_SECRET_KEYS) {
    contents = contents.replace(
      new RegExp(`^${key}=(?:""|'')?[ \\t]*$`, 'm'),
      `${key}=${randomBytes(32).toString('base64')}`,
    );
  }

  writeFileSync(target, contents);
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
      copyEnvironmentTemplate(template, target);
      outcome.created.push(target);
      logger.success(`created ${target}`);

      continue;
    }

    if (await confirmReset(file)) {
      copyEnvironmentTemplate(template, target);
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
