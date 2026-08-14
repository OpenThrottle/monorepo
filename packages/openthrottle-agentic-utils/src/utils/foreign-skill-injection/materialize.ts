/**
 * @description Server/repo-scoped materializer for foreign-skill injection.
 * `ensureMaterialized` idempotently projects the resolved skill manifest into a
 * foreign repo's `.agents/skills` + `.claude/skills` (symlinks on host, copies
 * under the container bridge), records a per-repo ledger, and keeps `git status`
 * clean via `.git/info/exclude`. `teardown` removes exactly and only the
 * ledger-recorded paths that are still OT-owned. See
 * docs/monorepo/foreign-workspace-skill-injection.md.
 */

import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  rmdirSync,
  symlinkSync,
} from 'node:fs';
import { join } from 'node:path';

import { resolveForeignSkillManifest } from '@openthrottle/openthrottle-skills';

import { getWorkspacePathMapping } from '../workspace-paths.ts';
import {
  removeManagedExcludeBlock,
  writeManagedExcludeBlock,
} from './git-exclude.ts';
import {
  deleteLedger,
  ledgerPathForRepo,
  readLedger,
  writeLedger,
} from './ledger.ts';
import {
  FOREIGN_SKILL_INJECTION_MODE,
  FOREIGN_SKILL_TARGET_DIRS,
} from './types.ts';
import type {
  ForeignSkillInjectionMode,
  ForeignSkillLedger,
  ForeignSkillLedgerEntry,
} from './types.ts';

/** @public */
export interface EnsureMaterializedOptions {
  readonly env?: NodeJS.ProcessEnv;
  /** Absolute path to `<OT_ROOT>/skills` (the curated SSOT source). */
  readonly otCuratedSkillsDir: string;
  /** Absolute path to the opt-in per-user experimental skills dir, if enabled. */
  readonly personalSkillsDir?: string | undefined;
  /** Absolute path to the foreign repo root (already container-translated). */
  readonly repoPath: string;
}

/** @public */
export interface EnsureMaterializedResult {
  /** Skill names actually present in the repo after this call (sorted, de-duplicated). */
  readonly injectedNames: readonly string[];
  readonly mode: ForeignSkillInjectionMode;
  readonly warnings: readonly string[];
}

/** @public */
export interface TeardownOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly repoPath: string;
}

/** A dangling symlink is invisible to existsSync; lstat still sees it. */
const isBrokenSymlink = (absPath: string): boolean => {
  try {
    return lstatSync(absPath).isSymbolicLink();
  } catch {
    return false;
  }
};

const skillMdFingerprint = (skillDir: string): string | undefined => {
  try {
    return createHash('sha256')
      .update(readFileSync(join(skillDir, 'SKILL.md'), 'utf8'))
      .digest('hex');
  } catch {
    return undefined;
  }
};

/**
 * True when the on-disk entry at `injectedAbs` is still the one OT created:
 * a symlink still pointing at `sourcePath`, or a copied directory whose
 * `SKILL.md` still matches the recorded fingerprint. A user-replaced path
 * returns false so it is never touched.
 */
const isEntryStillOurs = (
  injectedAbs: string,
  entry: ForeignSkillLedgerEntry,
): boolean => {
  if (entry.mode === FOREIGN_SKILL_INJECTION_MODE.symlink) {
    try {
      if (!lstatSync(injectedAbs).isSymbolicLink()) {
        return false;
      }
      return readlinkSync(injectedAbs) === entry.sourcePath;
    } catch {
      return false;
    }
  }
  // copy mode
  try {
    if (!lstatSync(injectedAbs).isDirectory()) {
      return false;
    }
  } catch {
    return false;
  }
  return (
    entry.fingerprint !== undefined &&
    skillMdFingerprint(injectedAbs) === entry.fingerprint
  );
};

/** Creates missing ancestor dirs of `relDir` under `repoPath`, recording which it created. */
const ensureDirRecordingCreated = (
  repoPath: string,
  relDir: string,
  createdDirs: Set<string>,
): void => {
  const segments = relDir.split('/');
  let relSoFar = '';
  for (const segment of segments) {
    relSoFar = relSoFar === '' ? segment : `${relSoFar}/${segment}`;
    const abs = join(repoPath, relSoFar);
    if (!existsSync(abs)) {
      mkdirSync(abs, { recursive: true });
      createdDirs.add(relSoFar);
    }
  }
};

/**
 * Skill names the target repo already owns: basenames present under its two
 * skill dirs that are NOT one of our own ledgered injected paths.
 */
const scanTargetOwnedSkillNames = (
  repoPath: string,
  ledgeredRelPaths: ReadonlySet<string>,
): Set<string> => {
  const names = new Set<string>();
  for (const dir of FOREIGN_SKILL_TARGET_DIRS) {
    let entries: readonly string[];
    try {
      entries = readdirSync(join(repoPath, dir));
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!ledgeredRelPaths.has(`${dir}/${name}`)) {
        names.add(name);
      }
    }
  }
  return names;
};

const injectEntry = (
  repoPath: string,
  relPath: string,
  sourcePath: string,
  name: string,
  mode: ForeignSkillInjectionMode,
  createdDirs: Set<string>,
): ForeignSkillLedgerEntry => {
  const injectedAbs = join(repoPath, relPath);
  const parentRel = relPath.slice(0, relPath.lastIndexOf('/'));
  ensureDirRecordingCreated(repoPath, parentRel, createdDirs);

  if (mode === FOREIGN_SKILL_INJECTION_MODE.symlink) {
    symlinkSync(sourcePath, injectedAbs, 'dir');
    return {
      fingerprint: undefined,
      injectedRelativePath: relPath,
      mode,
      name,
      sourcePath,
    };
  }

  cpSync(sourcePath, injectedAbs, { dereference: true, recursive: true });
  return {
    fingerprint: skillMdFingerprint(injectedAbs),
    injectedRelativePath: relPath,
    mode,
    name,
    sourcePath,
  };
};

/**
 * @description Idempotently ensures OT's resolved skill layer exists in the
 * foreign repo. Safe to call at the start of every run: entries already present
 * and still OT-owned are reused untouched; only missing entries are created;
 * target-owned names never enter (excluded at resolve time) and any pre-existing
 * non-OT path is skipped rather than overwritten. Always leaves the ledger and
 * `.git/info/exclude` block consistent with what is on disk.
 *
 * @public
 */
export const ensureMaterialized = (
  options: EnsureMaterializedOptions,
): EnsureMaterializedResult => {
  const { otCuratedSkillsDir, personalSkillsDir, repoPath } = options;
  const env = options.env ?? process.env;

  const ledgerPath = ledgerPathForRepo(repoPath, env);
  const existing = readLedger(ledgerPath);
  const existingRelPaths = new Set(
    (existing?.entries ?? []).map((entry) => entry.injectedRelativePath),
  );

  const targetOwned = scanTargetOwnedSkillNames(repoPath, existingRelPaths);

  const { entries: manifest, warnings } = resolveForeignSkillManifest({
    otCuratedSkillsDir,
    personalSkillsDir,
    targetRepoSkillNames: targetOwned,
  });

  const mode = getWorkspacePathMapping(env)
    ? FOREIGN_SKILL_INJECTION_MODE.copy
    : FOREIGN_SKILL_INJECTION_MODE.symlink;

  const existingByRel = new Map(
    (existing?.entries ?? []).map((entry) => [
      entry.injectedRelativePath,
      entry,
    ]),
  );
  const createdDirs = new Set(existing?.createdDirs ?? []);
  const ledgerEntries: ForeignSkillLedgerEntry[] = [];
  const allWarnings = [...warnings];

  for (const skill of manifest) {
    for (const dir of FOREIGN_SKILL_TARGET_DIRS) {
      const relPath = `${dir}/${skill.name}`;
      const injectedAbs = join(repoPath, relPath);
      const prior = existingByRel.get(relPath);

      if (prior !== undefined && isEntryStillOurs(injectedAbs, prior)) {
        // Reuse across runs — no work, keep the ledger entry as-is.
        ledgerEntries.push(prior);
        continue;
      }

      // Defense in depth: a path that exists but is not one of ours is
      // target-owned (or user-created) and must never be overwritten.
      if (existsSync(injectedAbs) || isBrokenSymlink(injectedAbs)) {
        allWarnings.push(
          `Skipping ${relPath}: a non-OT entry already occupies this path`,
        );
        continue;
      }

      try {
        ledgerEntries.push(
          injectEntry(
            repoPath,
            relPath,
            skill.sourcePath,
            skill.name,
            mode,
            createdDirs,
          ),
        );
      } catch (error) {
        allWarnings.push(
          `Failed to inject ${relPath}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  const ledger: ForeignSkillLedger = {
    createdDirs: [...createdDirs].sort(),
    entries: ledgerEntries,
    repoPath,
    updatedAt: new Date().toISOString(),
  };

  const relPaths = ledgerEntries.map((entry) => entry.injectedRelativePath);
  if (relPaths.length > 0) {
    writeManagedExcludeBlock(repoPath, relPaths);
    writeLedger(ledgerPath, ledger);
  } else {
    // Nothing injected (e.g. target owns everything) — leave no residue.
    removeManagedExcludeBlock(repoPath);
    deleteLedger(ledgerPath);
  }

  const injectedNames = [
    ...new Set(ledgerEntries.map((entry) => entry.name)),
  ].sort();

  return { injectedNames, mode, warnings: allWarnings };
};

/**
 * @description Removes exactly and only the ledger-recorded paths that are
 * still OT-owned, clears the managed `.git/info/exclude` block, prunes
 * OT-created empty dirs, and deletes the ledger. A user-replaced entry is left
 * in place. No-op when no ledger exists.
 *
 * @public
 */
export const teardown = (options: TeardownOptions): void => {
  const { repoPath } = options;
  const env = options.env ?? process.env;

  const ledgerPath = ledgerPathForRepo(repoPath, env);
  const ledger = readLedger(ledgerPath);
  if (ledger === undefined) {
    return;
  }

  for (const entry of ledger.entries) {
    const injectedAbs = join(repoPath, entry.injectedRelativePath);
    if (isEntryStillOurs(injectedAbs, entry)) {
      rmSync(injectedAbs, { force: true, recursive: true });
    }
  }

  removeManagedExcludeBlock(repoPath);

  // Remove OT-created dirs, deepest-first, only when now empty.
  for (const relDir of [...ledger.createdDirs].sort().reverse()) {
    const absDir = join(repoPath, relDir);
    try {
      // rmdirSync only removes an empty dir (throws ENOTEMPTY otherwise), so a
      // dir the user has since populated is never blown away.
      rmdirSync(absDir);
    } catch {
      // Missing or non-empty — leave it.
    }
  }

  deleteLedger(ledgerPath);
};
