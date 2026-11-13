import { describe, expect, it } from 'vitest';

import { LINKED_ARTIFACTS_PANEL_COPY } from '~/routing/plans/data/data.copy';
import {
  getTypeFilterLabel,
  getVerificationFilterLabel,
} from '~/routing/plans/utils/linked-artifacts-filter-labels';
import { ARTIFACT_FILTER_ALL } from '~/routing/plans/utils/summarizeLinkedArtifacts';

describe('getVerificationFilterLabel', () => {
  describe('when the value is the all sentinel', () => {
    it('returns the all-verifications copy', () => {
      expect(getVerificationFilterLabel(ARTIFACT_FILTER_ALL)).toBe(
        LINKED_ARTIFACTS_PANEL_COPY.allVerificationsLabel,
      );
    });
  });

  describe('when the value is a verification state', () => {
    it('returns it unchanged', () => {
      expect(getVerificationFilterLabel('orphaned')).toBe('orphaned');
    });
  });
});

describe('getTypeFilterLabel', () => {
  describe('when the value is the all sentinel', () => {
    it('returns the all-types copy', () => {
      expect(getTypeFilterLabel(ARTIFACT_FILTER_ALL)).toBe(
        LINKED_ARTIFACTS_PANEL_COPY.allTypesLabel,
      );
    });
  });

  describe('when the type has no group label', () => {
    it('falls back to the raw value', () => {
      expect(getTypeFilterLabel('not-a-known-type')).toBe('not-a-known-type');
    });
  });
});
