/**
 * @description Types + constants for server-scoped, non-mutating injection of
 * OpenThrottle curated skills into a foreign repo. See
 * docs/monorepo/foreign-workspace-skill-injection.md for the full design.
 */

/**
 * On-disk realization of an injected skill. `symlink` on host runs (cheap,
 * self-evidently OT-owned); `copy` under the container path-mapping bridge,
 * where a symlink target on the OT mount would not resolve inside the
 * workspace mount namespace.
 *
 * @public
 */
export const FOREIGN_SKILL_INJECTION_MODE = {
  copy: 'copy',
  symlink: 'symlink',
} as const;

/** @public */
export type ForeignSkillInjectionMode =
  (typeof FOREIGN_SKILL_INJECTION_MODE)[keyof typeof FOREIGN_SKILL_INJECTION_MODE];

/**
 * The two in-repo directories whose union reaches all five agent CLIs
 * (`.agents/skills` → claude/codex/opencode/cursor; `.claude/skills` →
 * claude/cursor/grok). Repo-relative, POSIX.
 *
 * @public
 */
export const FOREIGN_SKILL_TARGET_DIRS = [
  '.agents/skills',
  '.claude/skills',
] as const;

/**
 * Env var overriding where per-repo ledgers are stored. Defaults to
 * `~/.openthrottle/foreign-skill-ledgers`.
 *
 * @public
 */
export const FOREIGN_SKILL_LEDGER_DIR_ENV =
  'OPENTHROTTLE_FOREIGN_SKILL_LEDGER_DIR';

/**
 * Markers bracketing our managed block inside the repo-local
 * `.git/info/exclude` (never the tracked `.gitignore`).
 *
 * @public
 */
export const GIT_EXCLUDE_BEGIN_MARKER =
  '# BEGIN OpenThrottle foreign-skill-injection (managed — do not edit)';

/** @public */
export const GIT_EXCLUDE_END_MARKER =
  '# END OpenThrottle foreign-skill-injection (managed)';

/**
 * One injected path recorded in a repo's ledger — the authoritative record for
 * teardown and the crash-recovery reaper.
 *
 * @public
 */
export interface ForeignSkillLedgerEntry {
  /**
   * For `copy` mode: sha256 of the copied `SKILL.md`, so the reaper can confirm
   * the directory is still our copy (and not user content) before removing it.
   * `undefined` for `symlink` mode (a symlink pointing at `sourcePath` is the
   * ownership proof there).
   */
  readonly fingerprint: string | undefined;
  /** Repo-relative POSIX path of the created entry, e.g. `.agents/skills/ot-plans`. */
  readonly injectedRelativePath: string;
  readonly mode: ForeignSkillInjectionMode;
  readonly name: string;
  /** Absolute path to the OT/personal source the entry was made from. */
  readonly sourcePath: string;
}

/**
 * Per-repo ledger: the exact set of paths OT injected into a foreign repo, plus
 * any directories OT created to hold them (for empty-dir cleanup on teardown).
 *
 * @public
 */
export interface ForeignSkillLedger {
  /** Repo-relative POSIX dirs OT created (deepest-last), removed if empty on teardown. */
  readonly createdDirs: readonly string[];
  readonly entries: readonly ForeignSkillLedgerEntry[];
  /** Host-truthful absolute path to the target repo root. */
  readonly repoPath: string;
  readonly updatedAt: string;
}
