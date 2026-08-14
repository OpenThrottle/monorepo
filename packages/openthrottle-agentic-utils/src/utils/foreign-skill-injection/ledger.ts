/**
 * @description Per-repo ledger storage for foreign-skill injection. Ledgers
 * live OUTSIDE every target repo (so they never dirty a consumer's git state)
 * in a single server-side directory, one JSON file per repo keyed by a hash of
 * the repo path — enabling the boot reaper to enumerate every repo OT touched.
 */

import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { FOREIGN_SKILL_LEDGER_DIR_ENV } from './types.ts';
import type { ForeignSkillLedger } from './types.ts';

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error;

/** Structural guard so JSON.parse output can be narrowed without a cast. */
const isForeignSkillLedger = (value: unknown): value is ForeignSkillLedger => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('entries' in value) || !('repoPath' in value)) {
    return false;
  }
  return Array.isArray(value.entries) && typeof value.repoPath === 'string';
};

/**
 * @description Resolves the directory holding all per-repo ledgers.
 * `OPENTHROTTLE_FOREIGN_SKILL_LEDGER_DIR` overrides the default
 * `~/.openthrottle/foreign-skill-ledgers`.
 *
 * @public
 */
export const resolveLedgerDir = (
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const override = env[FOREIGN_SKILL_LEDGER_DIR_ENV]?.trim();
  if (override !== undefined && override !== '') {
    return override;
  }
  return join(homedir(), '.openthrottle', 'foreign-skill-ledgers');
};

/**
 * @description Absolute path to the ledger file for a given repo. The filename
 * is a hash of the repo path (stable across runs), so the same repo always maps
 * to the same ledger.
 *
 * @public
 */
export const ledgerPathForRepo = (
  repoPath: string,
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const hash = createHash('sha256').update(repoPath).digest('hex').slice(0, 32);
  return join(resolveLedgerDir(env), `${hash}.json`);
};

/**
 * @description Reads a repo's ledger, or `undefined` when none exists / is
 * unreadable / is malformed. Never throws — a corrupt ledger is treated as
 * absent so the reaper and materializer degrade gracefully.
 *
 * @public
 */
export const readLedger = (
  ledgerPath: string,
): ForeignSkillLedger | undefined => {
  let raw: string;
  try {
    raw = readFileSync(ledgerPath, 'utf8');
  } catch {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isForeignSkillLedger(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

/**
 * @description Atomically writes a repo's ledger, creating the ledger dir as
 * needed.
 *
 * @public
 */
export const writeLedger = (
  ledgerPath: string,
  ledger: ForeignSkillLedger,
): void => {
  mkdirSync(join(ledgerPath, '..'), { recursive: true });
  writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
};

/**
 * @description Removes a repo's ledger file. No-op when already gone.
 *
 * @public
 */
export const deleteLedger = (ledgerPath: string): void => {
  rmSync(ledgerPath, { force: true });
};

/**
 * @description Absolute paths of every ledger currently on disk — the reaper's
 * work-list. Empty when the ledger dir does not exist.
 *
 * @public
 */
export const listLedgerPaths = (
  env: NodeJS.ProcessEnv = process.env,
): readonly string[] => {
  const dir = resolveLedgerDir(env);
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => join(dir, name));
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};
