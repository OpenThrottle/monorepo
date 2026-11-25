/**
 * Recognise a skill that foreign skill injection COPIED into this repo.
 *
 * Injection normally writes a symlink, and `detectScope` classifies that by resolving it. Under the
 * container path-mapping bridge it writes a real directory instead (a symlink onto the server's
 * mount would not resolve inside the workspace mount), and a copy carries no trace of where it came
 * from: it realpaths to itself, inside this repo, so it used to read as `third-party`. The only
 * record that it is OT's is the injection ledger, which lives outside every target repo.
 *
 * The ledger format is vendored, not imported: the source of truth is
 * `packages/openthrottle-agentic-utils/src/utils/foreign-skill-*.ts` (`foreign-skill-ledger.ts` for the
 * directory, `types/foreign-skill-injection.ts` for the entry shape, `foreign-skill-materialize.ts` for the fingerprint), but that
 * package's barrel pulls in `openai`, the drivers package and postgres, and these hooks are
 * esbuild-bundled into committed `.cjs` files that must stay runtime-dependency-free — the same
 * reason `scope.ts` vendors the personal skills root. Change one, change both.
 *
 * Matching is by fingerprint across every ledger rather than by the ledger's `repoPath` key,
 * because that key is the HOST path while a containerised hook sees the CONTAINER path, and the
 * copy mode this exists for is exactly the containerised one. A copy whose `SKILL.md` hashes to the
 * ledgered fingerprint is the ownership proof the reaper already relies on before deleting one.
 *
 * Synchronous and fail-open: every error yields null.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Env var overriding the ledger directory; mirrors `FOREIGN_SKILL_LEDGER_DIR_ENV`. */
const LEDGER_DIR_ENV = 'OPENTHROTTLE_FOREIGN_SKILL_LEDGER_DIR';

/** The subset of a ledger entry this check reads, for a `copy`-mode entry. */
export interface CopiedLedgerEntry {
  readonly fingerprint: string;
  readonly injectedRelativePath: string;
  readonly name: string;
  readonly sourcePath: string;
}

/** @description Mirrors `resolveLedgerDir`: the override, else `~/.openthrottle/foreign-skill-ledgers`. */
const resolveLedgerDir = (env: NodeJS.ProcessEnv): string => {
  const override = env[LEDGER_DIR_ENV]?.trim();
  if (override !== undefined && override !== '') {
    return override;
  }
  return path.join(os.homedir(), '.openthrottle', 'foreign-skill-ledgers');
};

const isCopiedLedgerEntry = (value: unknown): value is CopiedLedgerEntry => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    'mode' in value &&
    value.mode === 'copy' &&
    'fingerprint' in value &&
    typeof value.fingerprint === 'string' &&
    'injectedRelativePath' in value &&
    typeof value.injectedRelativePath === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'sourcePath' in value &&
    typeof value.sourcePath === 'string'
  );
};

/** @description The `copy` entries of one ledger file; a missing or malformed file has none. */
const readCopiedEntries = (
  ledgerPath: string,
): readonly CopiedLedgerEntry[] => {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null) {
      return [];
    }
    if (!('entries' in parsed) || !Array.isArray(parsed.entries)) {
      return [];
    }
    return parsed.entries.filter(isCopiedLedgerEntry);
  } catch {
    return [];
  }
};

/** @description Mirrors `skillMdFingerprint`: sha256 of `SKILL.md` read as utf8. */
const skillMdFingerprint = (skillDir: string): string | null => {
  try {
    return createHash('sha256')
      .update(fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8'))
      .digest('hex');
  } catch {
    return null;
  }
};

/**
 * @description True when the ledgered relative path stays inside the repo. A ledger is ours, but
 * it is still a file on disk: refuse to hash anything it could point outside the checkout.
 */
const isContainedRelativePath = (relativePath: string): boolean => {
  if (relativePath === '' || path.isAbsolute(relativePath)) {
    return false;
  }
  return !relativePath.split(/[\\/]/).includes('..');
};

/**
 * @description The ledger entry recording that OT copied `skillName` into `repoRoot`, or null when
 * no ledger does — including when the copy was since edited, which makes it the user's, not OT's.
 */
export const findLedgeredCopy = (
  skillName: string,
  repoRoot: string,
  env: NodeJS.ProcessEnv,
): CopiedLedgerEntry | null => {
  const ledgerDir = resolveLedgerDir(env);
  let ledgerFiles: readonly string[];
  try {
    ledgerFiles = fs
      .readdirSync(ledgerDir)
      .filter((file) => file.endsWith('.json'));
  } catch {
    return null;
  }

  const candidates = ledgerFiles.flatMap((file) => {
    return readCopiedEntries(path.join(ledgerDir, file)).filter((entry) => {
      return (
        entry.name === skillName &&
        isContainedRelativePath(entry.injectedRelativePath)
      );
    });
  });

  const match = candidates.find((entry) => {
    const copied = path.join(repoRoot, entry.injectedRelativePath);
    return skillMdFingerprint(copied) === entry.fingerprint;
  });
  return match ?? null;
};
