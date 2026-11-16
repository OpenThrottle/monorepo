/**
 * @description The forges a work-ledger repository can live on. A value here is what an artifact
 * payload's optional `forge` field and an artifact external-key prefix carry.
 */
export const FORGE_KIND = {
  GITHUB: 'github',
  GITLAB: 'gitlab',
} as const;

/**
 * @description The forge assumed when a payload or row names none. Every ledger row written before
 * the forge abstraction existed is a GitHub row, so absence must keep meaning GitHub.
 */
export const DEFAULT_FORGE_KIND = FORGE_KIND.GITHUB;

/** @description Compare statuses meaning `head` is reachable from `base`, i.e. it has landed. */
export const REACHABLE_COMPARE_STATUSES: readonly string[] = [
  'behind',
  'identical',
];
