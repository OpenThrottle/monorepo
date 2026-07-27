// @vitest-environment node
//
// The SSR-guarded storage factory in atom.chat-toolbar takes its no-op-storage
// branch when `typeof window === 'undefined'`. jsdom always defines `window`
// (and it is non-configurable, so it can't be stubbed away), so this branch is
// only reachable under the node test environment — hence the docblock above.
// Imports are static (not in-test dynamic imports) so the check stays fast and
// does not time out when the whole suite runs concurrently.
import { describe, expect, test } from 'vitest';
import { createStore } from 'jotai/vanilla';
import {
  chatToolbarStateAtom,
  DEFAULT_CHAT_TOOLBAR_STATE,
} from '../atom.chat-toolbar';

describe('chatToolbarStateAtom SSR (no window)', () => {
  test('atom read hydrates to default without throwing', () => {
    expect(typeof window).toBe('undefined');

    const store = createStore();

    expect(() => store.get(chatToolbarStateAtom)).not.toThrow();
    expect(store.get(chatToolbarStateAtom)).toEqual(DEFAULT_CHAT_TOOLBAR_STATE);
  });
});
