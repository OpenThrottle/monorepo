/**
 * Known violations of the hook primitive shape that `audit-hook-shape.ts
 * --strict` tolerates. Empty since every hook was brought to spec; keep it
 * that way.
 *
 * This list can only shrink. Strict mode fails on a violation that is not
 * listed here, and it also fails on a listed entry that no longer violates, so
 * the entry for a fixed file is deleted in the same change that fixes it. Never
 * add an entry to get a new violation past the gate: fix the file, or opt it out
 * with a written reason (docs/monorepo/hook-primitive-shape.md § Opt-out).
 */

/** The audit rules an allowlist entry can name. */
export type HookShapeRule =
  'H3-imported-constant' | 'H6-file-name' | 'H6-hook-outside-hooks';

export interface HookShapeAllowlistEntry {
  /** Repo-relative path of the offending file. */
  readonly file: string;
  readonly rule: HookShapeRule;
  /** The module-scope name; set only for `H3-imported-constant`. */
  readonly symbol: string | undefined;
}

export const HOOK_SHAPE_ALLOWLIST: readonly HookShapeAllowlistEntry[] = [];
