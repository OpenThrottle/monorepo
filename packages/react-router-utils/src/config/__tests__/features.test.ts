import { afterEach, describe, expect, test, vi } from 'vitest';

const loadFeatures = async (
  env: Record<string, unknown>,
): Promise<typeof import('../features')> => {
  vi.resetModules();
  vi.stubGlobal('window', { env });
  return import('../features');
};

describe('config/features', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('FEATURE_BETA_PREVIEW defaults to true when unset', async () => {
    const { FEATURE_BETA_PREVIEW } = await loadFeatures({});

    expect(FEATURE_BETA_PREVIEW).toBe(false);
  });

  test('FEATURE_BETA_PREVIEW can be explicitly disabled', async () => {
    const { FEATURE_BETA_PREVIEW } = await loadFeatures({
      FEATURE_BETA_PREVIEW: 'false',
    });

    expect(FEATURE_BETA_PREVIEW).toBe(false);
  });

  test('FEATURE_BETA_PREVIEW can be explicitly enabled', async () => {
    const { FEATURE_BETA_PREVIEW } = await loadFeatures({
      FEATURE_BETA_PREVIEW: 'true',
    });

    expect(FEATURE_BETA_PREVIEW).toBe(true);
  });

  test('falls back to false for unrecognized values', async () => {
    const { FEATURE_BETA_PREVIEW } = await loadFeatures({
      FEATURE_BETA_PREVIEW: 'maybe',
    });

    expect(FEATURE_BETA_PREVIEW).toBe(false);
  });

  test('treats falsy encodings (0, no) as false', async () => {
    const zero = await loadFeatures({ FEATURE_BETA_PREVIEW: '0' });
    expect(zero.FEATURE_BETA_PREVIEW).toBe(false);

    const no = await loadFeatures({ FEATURE_BETA_PREVIEW: 'NO' });
    expect(no.FEATURE_BETA_PREVIEW).toBe(false);
  });

  test('FEATURE_BLOG_ENABLED is off when unset or unrecognized', async () => {
    const unset = await loadFeatures({});
    expect(unset.FEATURE_BLOG_ENABLED).toBe(false);

    const garbage = await loadFeatures({ FEATURE_BLOG_ENABLED: 'maybe' });
    expect(garbage.FEATURE_BLOG_ENABLED).toBe(false);
  });

  test('FEATURE_BLOG_ENABLED turns on for truthy encodings', async () => {
    const enabled = await loadFeatures({ FEATURE_BLOG_ENABLED: 'true' });
    expect(enabled.FEATURE_BLOG_ENABLED).toBe(true);

    const one = await loadFeatures({ FEATURE_BLOG_ENABLED: '1' });
    expect(one.FEATURE_BLOG_ENABLED).toBe(true);
  });
});
