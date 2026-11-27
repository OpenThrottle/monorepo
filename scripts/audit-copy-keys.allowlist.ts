/**
 * @description Known unused `data/copy.ts` keys that `audit-copy-keys.ts --strict`
 * tolerates. Each entry is `<repo-relative copy file>::<CONST>.<key.path>`.
 *
 * This list can only shrink. Strict mode fails on an unused key that is not
 * listed here, and on a listed entry that is now used or no longer exists, so
 * an entry is deleted in the same change that removes or starts using the key.
 * Never add an entry to get a new dead key past the gate: delete the key.
 */
export const COPY_KEYS_ALLOWLIST: readonly string[] = [];
