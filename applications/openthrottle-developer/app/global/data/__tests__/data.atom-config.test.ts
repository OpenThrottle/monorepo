import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  CONFIG_STORAGE_KEY,
  DEFAULT_APPEARANCE_CONFIG,
} from '../data.appearance-config';

// The pure brand/CSS helpers (cssColorToHex, getBrandColorInputValue,
// buildAppearanceRootCssBlock, APPEARANCE_* keys) live in and are tested by
// @openthrottle/react-router-utils; normalizeAppearanceConfig is tested in
// `global/utils/__tests__/appearance-config.test.ts`. This suite covers the
// config constants and configAtom.

describe('appearance config constants', () => {
  test('CONFIG_STORAGE_KEY is stable for localStorage', () => {
    expect(CONFIG_STORAGE_KEY).toBe(
      'openthrottle-developer:settings:appearance',
    );
  });

  test('DEFAULT_APPEARANCE_CONFIG defaults theme and motion to system', () => {
    expect(DEFAULT_APPEARANCE_CONFIG).toEqual({
      brand: undefined,
      reducedMotion: 'system',
      theme: 'system',
      themeId: undefined,
    });
  });
});

describe('configAtom localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  test('hydrates legacy persisted JSON on module init', async () => {
    localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({ accentColor: '#aabbcc', theme: 'dark' }),
    );

    const { configAtom } = await import('../data.atom-config');
    const { createStore } = await import('jotai/vanilla');
    const store = createStore();

    expect(store.get(configAtom)).toEqual({
      brand: '#aabbcc',
      reducedMotion: 'system',
      theme: 'dark',
      themeId: undefined,
    });
  });

  test('hydrates a persisted system theme on module init', async () => {
    localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({ theme: 'system' }),
    );

    const { configAtom } = await import('../data.atom-config');
    const { createStore } = await import('jotai/vanilla');
    const store = createStore();

    expect(store.get(configAtom).theme).toBe('system');
  });

  test('hydrates invalid persisted JSON as defaults (system) on module init', async () => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ theme: 'nope' }));

    const { configAtom } = await import('../data.atom-config');
    const { createStore } = await import('jotai/vanilla');
    const store = createStore();

    expect(store.get(configAtom)).toEqual(DEFAULT_APPEARANCE_CONFIG);
  });

  test('persists updates under CONFIG_STORAGE_KEY', async () => {
    const { configAtom } = await import('../data.atom-config');
    const { createStore } = await import('jotai/vanilla');
    const store = createStore();

    store.set(configAtom, {
      brand: '#112233',
      reducedMotion: 'system',
      theme: 'dark',
      themeId: undefined,
    });

    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed: {
      brand: string;
      theme: string;
    } = JSON.parse(raw ?? '{}');
    expect(parsed.brand).toBe('#112233');
    expect(parsed.theme).toBe('dark');
  });
});
