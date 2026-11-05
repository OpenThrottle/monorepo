import { describe, expect, it } from 'vitest';

import { buildRootLoaderFailureBannerCopy } from '../root-loader-failure-banner-copy';

describe('buildRootLoaderFailureBannerCopy', () => {
  describe('without a failure', () => {
    it('returns the ambiguous-session copy and no key or step line', () => {
      const copy = buildRootLoaderFailureBannerCopy(null);

      expect(copy.failureKey).toBeNull();
      expect(copy.stepLine).toBeNull();
      expect(copy.title).toBe('Session could not be verified');
      expect(copy.detail.length).toBeGreaterThan(0);
    });
  });

  describe('with a failure', () => {
    it('derives a key from step, kind and message plus a step line', () => {
      const copy = buildRootLoaderFailureBannerCopy({
        kind: 'transport',
        message: 'boom',
        step: 'health',
      });

      expect(copy.failureKey).toBe('health:transport:boom');
      expect(copy.stepLine).toContain('Failed while loading');
      expect(copy.detail).toBe('boom');
    });
  });
});
