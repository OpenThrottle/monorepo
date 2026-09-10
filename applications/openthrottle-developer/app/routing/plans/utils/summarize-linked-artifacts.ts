/**
 * @description Ledger summary + client-side filtering for
 * {@link LinkedArtifactsPanel}. Both routes already fetch the full artifact
 * list, so filtering is pure array work — no second query, and deliberately no
 * URL search params (those revalidate the plan loader and would thrash the
 * deferred ledger boundary on every filter click).
 */

import { LINKED_ARTIFACT_GROUP_ORDER } from '~/routing/plans/data/linked-artifacts-panel-groups';

export interface SummarizableArtifact {
  type: string;
  verification: string;
}

/** Sentinel meaning "no filter applied" for either dimension. */
export const ARTIFACT_FILTER_ALL = 'all';

/**
 * Verification states, ordered so the one worth acting on reads last and
 * loudest. `orphaned` is a claim git could not confirm.
 */
export const ARTIFACT_VERIFICATIONS: readonly string[] = [
  'verified',
  'unverified',
  'orphaned',
];

export interface LinkedArtifactsSummaryModel {
  /** Count per verification state, including zeroes for the known states. */
  byVerification: Record<string, number>;
  /**
   * Types actually present, ordered to match the rendered groups so a filter
   * chip sits in the same position as its section. Never a hardcoded list.
   */
  presentTypes: string[];
  total: number;
}

/**
 * @description Summarize a ledger: total, per-verification counts, and which
 * types are actually present (so a type filter can be driven by the data
 * rather than by an assumed closed set).
 * @public
 */
export const summarizeLinkedArtifacts = (
  artifacts: readonly SummarizableArtifact[],
): LinkedArtifactsSummaryModel => {
  const byVerification: Record<string, number> = {};

  for (const verification of ARTIFACT_VERIFICATIONS) {
    byVerification[verification] = 0;
  }

  const presentTypes: string[] = [];

  for (const artifact of artifacts) {
    byVerification[artifact.verification] =
      (byVerification[artifact.verification] ?? 0) + 1;

    if (!presentTypes.includes(artifact.type)) {
      presentTypes.push(artifact.type);
    }
  }

  // Same ordering as the groups below, so chips and sections agree.
  presentTypes.sort((a, b) => {
    const rankA = LINKED_ARTIFACT_GROUP_ORDER.indexOf(a);
    const rankB = LINKED_ARTIFACT_GROUP_ORDER.indexOf(b);
    const normalizedA =
      rankA === -1 ? LINKED_ARTIFACT_GROUP_ORDER.length : rankA;
    const normalizedB =
      rankB === -1 ? LINKED_ARTIFACT_GROUP_ORDER.length : rankB;

    return normalizedA === normalizedB
      ? a.localeCompare(b)
      : normalizedA - normalizedB;
  });

  return { byVerification, presentTypes, total: artifacts.length };
};

/**
 * @description Apply the verification and type filters. Either dimension set
 * to `ARTIFACT_FILTER_ALL` matches everything.
 * @public
 */
export const filterLinkedArtifacts = <T extends SummarizableArtifact>(
  artifacts: readonly T[],
  verification: string,
  type: string,
): T[] =>
  artifacts.filter(
    (artifact) =>
      (verification === ARTIFACT_FILTER_ALL ||
        artifact.verification === verification) &&
      (type === ARTIFACT_FILTER_ALL || artifact.type === type),
  );
