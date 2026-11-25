/**
 * Declarations for the plain-ESM preinstall guard. The implementation is `.mjs`
 * (see the header of check-node-engine.mjs for why it cannot be TypeScript),
 * and `allowJs` is false workspace-wide, so its exported range logic is typed
 * here to keep scripts/__tests__/check-node-engine.test.ts type-checked.
 */

/** A parsed `[major, minor, patch]` triple. */
export type ParsedVersion = readonly [number, number, number];

/** Parse `major.minor.patch` off the front of a version-ish string. */
export declare const parseVersion: (value: string) => ParsedVersion | null;

/**
 * Evaluate a `||`-separated range of space-separated comparators.
 * Returns `null` when the range uses syntax the parser does not implement.
 */
export declare const satisfies: (
  version: ParsedVersion,
  range: string,
) => boolean | null;

/** Where {@link findSatisfyingNvmBin} looks, and the `.nvmrc` pin it prefers. */
export interface NvmLookup {
  readonly nvmDir: string;
  readonly pinned: string;
}

/**
 * The bin dir of an installed nvm Node that satisfies `range` (the `.nvmrc`
 * pin first, else the newest fit), or `null` when none does.
 */
export declare const findSatisfyingNvmBin: (
  range: string,
  lookup: NvmLookup,
) => string | null;
