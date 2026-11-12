import { describe, expect, it } from 'vitest';

import { getLinkedArtifactVerifiedWhen } from '~/routing/plans/utils/getLinkedArtifactVerifiedWhen';
import { formatProducedAt } from '~/routing/plans/utils/linked-artifacts-panel';

describe('getLinkedArtifactVerifiedWhen', () => {
  describe('when there is no verification timestamp', () => {
    it('says it is not yet verified', () => {
      expect(getLinkedArtifactVerifiedWhen(null)).toBe('not yet verified');
      expect(getLinkedArtifactVerifiedWhen(undefined)).toBe('not yet verified');
    });
  });

  describe('when there is a verification timestamp', () => {
    it('formats it like the produced-at label', () => {
      const verifiedAt = '2026-11-01T12:00:00.000Z';

      expect(getLinkedArtifactVerifiedWhen(verifiedAt)).toBe(
        formatProducedAt(verifiedAt),
      );
    });
  });
});
