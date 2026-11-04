import { afterEach, describe, expect, test, vi } from 'vitest';

const loadHelpers = async (
  enabled: boolean,
): Promise<typeof import('../blog-enabled')> => {
  vi.resetModules();
  vi.doMock('@openthrottle/react-router-utils', () => ({
    FEATURE_BLOG_ENABLED: enabled,
  }));

  return import('../blog-enabled');
};

describe('blog-enabled', () => {
  afterEach(() => {
    vi.doUnmock('@openthrottle/react-router-utils');
    vi.resetModules();
  });

  describe('when FEATURE_BLOG_ENABLED is on', () => {
    test('isBlogEnabled is true and assertBlogEnabled does not throw', async () => {
      const { assertBlogEnabled, isBlogEnabled } = await loadHelpers(true);

      expect(isBlogEnabled()).toBe(true);
      expect(() => assertBlogEnabled()).not.toThrow();
    });
  });

  describe('when FEATURE_BLOG_ENABLED is off', () => {
    test('isBlogEnabled is false and assertBlogEnabled throws a 404', async () => {
      const { assertBlogEnabled, isBlogEnabled } = await loadHelpers(false);
      let thrown: unknown;

      try {
        assertBlogEnabled();
      } catch (error) {
        thrown = error;
      }

      expect(isBlogEnabled()).toBe(false);
      expect(thrown).toMatchObject({ init: { status: 404 } });
    });
  });
});
