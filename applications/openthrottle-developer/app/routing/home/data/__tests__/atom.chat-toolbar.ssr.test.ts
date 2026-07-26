// @vitest-environment node
//
// The SSR-guarded storage factory in atom.chat-toolbar takes its no-op-storage
// branch when `typeof window === 'undefined'`. jsdom always defines `window`
// (and it is non-configurable, so it can't be stubbed away), so this branch is
// only reachable under the node test environment — hence the docblock above.
import { describe, expect, test } from 'vitest';

describe('chatToolbarStateAtom SSR (no window)', () => {
  test('module import and atom read do not throw and hydrate to default', async () => {
    expect(typeof window).toBe('undefined');

    const { chatToolbarStateAtom, DEFAULT_CHAT_TOOLBAR_STATE } =
      await import('../atom.chat-toolbar');
    const { createStore } = await import('jotai/vanilla');
    const store = createStore();

    expect(() => store.get(chatToolbarStateAtom)).not.toThrow();
    expect(store.get(chatToolbarStateAtom)).toEqual(DEFAULT_CHAT_TOOLBAR_STATE);
  });
});
