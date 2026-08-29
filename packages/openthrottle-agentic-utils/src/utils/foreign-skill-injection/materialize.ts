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
  realpathSync,
  rmSync,
  rmdirSync,
  symlinkSync,
} from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';

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
  GIT_EXCLUDE_OWNER,
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
 * @description Resolves the target dirs to the repo-relative locations that actually receive files.
 *
 * A target dir can be a SYMLINK into the repo's own tracked space — `.claude/skills -> ../skills` is
 * a real legacy layout. Writing through it lands files somewhere other than the path we would record
 * and exclude, so `.git/info/exclude` matches nothing and the target repo's `git status` goes dirty,
 * breaking the non-mutation guarantee. Resolving first keeps the recorded path, the excluded path
 * and the on-disk path the same string.
 *
 * Returns dirs in `FOREIGN_SKILL_TARGET_DIRS` order, and:
 * - **refuses** a dir resolving outside the repo — `.git/info/exclude` patterns are worktree
 *   relative, so such a path can never be hidden and injecting there could never be clean;
 * - **de-duplicates** dirs resolving to the same real location (e.g. `.claude/skills` symlinked to
 *   `.agents/skills`), which would otherwise inject once and then report OT's own entry as a
 *   foreign occupant on the second pass.
 *
 * A dir that does not exist yet is not resolved — it is created later, in place, as itself.
 */
const resolveTargetDirs = (
  repoPath: string,
  warnings: string[],
): readonly string[] => {
  // Resolve the repo root too: on macOS a repo under /var/... really lives at /private/var/...,
  // and comparing a resolved target against an unresolved root would call every dir "outside".
  let repoReal: string;
  try {
    repoReal = realpathSync(repoPath);
  } catch {
    return FOREIGN_SKILL_TARGET_DIRS;
  }

  const resolved: string[] = [];
  const seen = new Set<string>();

  for (const dir of FOREIGN_SKILL_TARGET_DIRS) {
    let relDir: string = dir;

    try {
      const real = realpathSync(join(repoPath, dir));
      const rel = relative(repoReal, real);

      if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
        warnings.push(
          `Skipping ${dir}: it resolves to ${real}, outside ${repoPath}. Injecting there cannot be hidden from git, so it would leave the repo dirty.`,
        );
        continue;
      }

      relDir = rel.split(sep).join('/');
    } catch {
      // Does not exist yet — created in place, as itself.
    }

    if (seen.has(relDir)) continue;
    seen.add(relDir);
    resolved.push(relDir);
  }

  return resolved;
};

/**
 * True when the entry at `absPath` is a real skill rather than a bare directory:
 * a symlink (someone else's materialization, which we must not clobber), or a
 * directory that actually carries a readable `SKILL.md`.
 *
 * An empty `<name>/` is NOT a skill. This matters because OT itself creates such
 * directories elsewhere, and counting them as target-owned made OT's target-wins
 * rule fire against OT's own scaffolding — silently dropping the curated skill
 * that should have been injected there. See
 * docs/monorepo/foreign-workspace-skill-injection.md §1.
 */
const isRealSkillEntry = (absPath: string): boolean => {
  try {
    if (lstatSync(absPath).isSymbolicLink()) {
      return true;
    }
  } catch {
    return false;
  }
  try {
    return lstatSync(join(absPath, 'SKILL.md')).isFile();
  } catch {
    return false;
  }
};

/**
 * Reclaims an EMPTY directory sitting where a skill should go, so injection can
 * proceed. Returns true when the path is now free.
 *
 * Only a directory with no children at all is removed — anything carrying content
 * is left untouched and stays an occupant. The case this exists for is OT's own
 * scaffolding: a bare `<slug>/` created by a sibling feature, which would
 * otherwise permanently block the very skill it was named after.
 */
const reclaimEmptyDir = (absPath: string): boolean => {
  try {
    if (lstatSync(absPath).isSymbolicLink()) {
      return false;
    }
    if (readdirSync(absPath).length > 0) {
      return false;
    }
    rmdirSync(absPath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Skill names the target repo already owns: real skills present under its two
 * skill dirs that are NOT one of our own ledgered injected paths.
 */
const scanTargetOwnedSkillNames = (
  repoPath: string,
  ledgeredRelPaths: ReadonlySet<string>,
  // Must be the RESOLVED dirs: these keys are matched against the ledger's recorded paths, so if the
  // two disagree OT's own entries look target-owned, drop out of the manifest, and the repo is
  // silently uninjected.
  targetDirs: readonly string[],
): Set<string> => {
  const names = new Set<string>();
  for (const dir of targetDirs) {
    let entries: readonly string[];
    try {
      entries = readdirSync(join(repoPath, dir));
    } catch {
      continue;
    }
    for (const name of entries) {
      if (ledgeredRelPaths.has(`${dir}/${name}`)) {
        continue;
      }
      if (!isRealSkillEntry(join(repoPath, dir, name))) {
        continue;
      }
      names.add(name);
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

  const targetDirWarnings: string[] = [];
  const targetDirs = resolveTargetDirs(repoPath, targetDirWarnings);

  const targetOwned = scanTargetOwnedSkillNames(
    repoPath,
    existingRelPaths,
    targetDirs,
  );

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
  const allWarnings = [...warnings, ...targetDirWarnings];

  for (const skill of manifest) {
    for (const dir of targetDirs) {
      const relPath = `${dir}/${skill.name}`;
      const injectedAbs = join(repoPath, relPath);
      const prior = existingByRel.get(relPath);

      if (prior !== undefined && isEntryStillOurs(injectedAbs, prior)) {
        // Reuse across runs — no work, keep the ledger entry as-is.
        ledgerEntries.push(prior);
        continue;
      }

      // Defense in depth: a path that exists but is not one of ours is
      // target-owned (or user-created) and must never be overwritten — unless it
      // is an empty directory, which is not a skill and only ever blocks the one
      // that belongs there.
      if (
        (existsSync(injectedAbs) || isBrokenSymlink(injectedAbs)) &&
        !reclaimEmptyDir(injectedAbs)
      ) {
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
    writeManagedExcludeBlock(
      repoPath,
      relPaths,
      GIT_EXCLUDE_OWNER.FOREIGN_SKILL_INJECTION,
    );
    writeLedger(ledgerPath, ledger);
  } else {
    // Nothing injected (e.g. target owns everything) — leave no residue.
    removeManagedExcludeBlock(
      repoPath,
      GIT_EXCLUDE_OWNER.FOREIGN_SKILL_INJECTION,
    );
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

  removeManagedExcludeBlock(
    repoPath,
    GIT_EXCLUDE_OWNER.FOREIGN_SKILL_INJECTION,
  );

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
