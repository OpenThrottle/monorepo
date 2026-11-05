import { formatProducedAt } from '~/routing/plans/utils/linked-artifacts-panel';

/**
 * @description "verified" is only meaningful with a when; without a timestamp
 * the verification badge says so instead.
 */
export const getLinkedArtifactVerifiedWhen = (
  verifiedAt: number | string | null | undefined,
): string => {
  if (verifiedAt == null) {
    return 'not yet verified';
  }

  return formatProducedAt(verifiedAt);
};
