import { createStore } from 'jotai';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { chatContextMeterAtom as ChatContextMeterAtom } from '../atom.chat-context-meter';

interface AtomModule {
  readonly CHAT_CONTEXT_METER_STORAGE_KEY: string;
  readonly chatContextMeterAtom: typeof ChatContextMeterAtom;
}

/**
 * `getOnInit` reads storage once, when the atom is created, so each case
 * seeds localStorage first and then imports a fresh copy of the module.
 */
const loadAtomModule = async (stored: string | null): Promise<AtomModule> => {
  vi.resetModules();
  const { CHAT_CONTEXT_METER_STORAGE_KEY } =
    await import('../atom.chat-context-meter');
  if (stored === null) {
    localStorage.removeItem(CHAT_CONTEXT_METER_STORAGE_KEY);
  } else {
    localStorage.setItem(CHAT_CONTEXT_METER_STORAGE_KEY, stored);
  }
  vi.resetModules();

  return import('../atom.chat-context-meter');
};

afterEach(() => {
  localStorage.clear();
});

describe('chatContextMeterAtom', () => {
  test('is off by default', async () => {
    const { chatContextMeterAtom } = await loadAtomModule(null);

    expect(createStore().get(chatContextMeterAtom)).toBe(false);
  });

  test('reads a stored opt-in', async () => {
    const { chatContextMeterAtom } = await loadAtomModule('true');

    expect(createStore().get(chatContextMeterAtom)).toBe(true);
  });

  test('treats any stored value other than true as off', async () => {
    const { chatContextMeterAtom } = await loadAtomModule('"yes"');

    expect(createStore().get(chatContextMeterAtom)).toBe(false);
  });

  test('persists a change', async () => {
    const { CHAT_CONTEXT_METER_STORAGE_KEY, chatContextMeterAtom } =
      await loadAtomModule(null);

    createStore().set(chatContextMeterAtom, true);

    expect(localStorage.getItem(CHAT_CONTEXT_METER_STORAGE_KEY)).toBe('true');
  });
});
