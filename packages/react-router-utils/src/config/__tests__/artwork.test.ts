import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mid-year so the year is stable in every time zone.
const FIXED_NOW = new Date('2026-06-15T12:00:00.000Z');

const loadArtwork = async (
  env: Record<string, unknown>,
): Promise<typeof import('../artwork')> => {
  vi.resetModules();
  vi.stubGlobal('window', { env });
  return import('../artwork');
};

describe('config/artwork', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('interpolates the domain (with https:// stripped) and current year', async () => {
    const { artwork, artworkYoda } = await loadArtwork({
      APP_URL: 'https://example.com',
    });

    const year = FIXED_NOW.getFullYear().toString();

    expect(artwork).toContain(`example.com Ⓒ ${year}`);
    expect(artwork).not.toContain('https://');
    expect(artworkYoda).toContain(`example.com Ⓒ ${year}`);
  });

  test('does not throw and emits an empty domain when APP_URL is unset', async () => {
    const { artwork, artworkYoda } = await loadArtwork({});

    const year = FIXED_NOW.getFullYear().toString();

    // An unset APP_URL must never throw at module-load time; the banner simply
    // renders an empty domain ahead of the copyright marker.
    expect(artwork).toContain(`Ⓒ ${year}`);
    expect(artwork).not.toContain('undefined');
    expect(artworkYoda).toContain(`Ⓒ ${year}`);
    expect(artworkYoda).not.toContain('undefined');
  });
});
