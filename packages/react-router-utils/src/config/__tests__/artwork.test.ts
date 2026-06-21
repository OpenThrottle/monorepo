import { afterEach, describe, expect, test, vi } from 'vitest';

const loadArtwork = async (
  env: Record<string, unknown>,
): Promise<typeof import('../artwork')> => {
  vi.resetModules();
  vi.stubGlobal('window', { env });
  return import('../artwork');
};

describe('config/artwork', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('interpolates the domain (with https:// stripped) and current year', async () => {
    const { artwork, artworkYoda } = await loadArtwork({
      APP_URL: 'https://example.com',
    });

    const year = new Date().getFullYear().toString();

    expect(artwork).toContain(`example.com Ⓒ ${year}`);
    expect(artwork).not.toContain('https://');
    expect(artworkYoda).toContain(`example.com Ⓒ ${year}`);
  });

  test('does not throw and emits an empty domain when APP_URL is unset', async () => {
    const { artwork, artworkYoda } = await loadArtwork({});

    const year = new Date().getFullYear().toString();

    // An unset APP_URL must never throw at module-load time; the banner simply
    // renders an empty domain ahead of the copyright marker.
    expect(artwork).toContain(`Ⓒ ${year}`);
    expect(artwork).not.toContain('undefined');
    expect(artworkYoda).toContain(`Ⓒ ${year}`);
    expect(artworkYoda).not.toContain('undefined');
  });
});
