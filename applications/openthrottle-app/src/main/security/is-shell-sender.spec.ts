import { describe, expect, it } from 'vitest';

import { isShellSender } from './is-shell-sender.ts';

const SHELL_URL = 'file:///app/out/renderer/index.html';

describe('isShellSender', () => {
  it('accepts the connection screen top frame', () => {
    expect(
      isShellSender({
        frameUrl: SHELL_URL,
        isMainFrame: true,
        shellUrl: SHELL_URL,
      }),
    ).toBe(true);
  });

  it('ignores query and hash', () => {
    expect(
      isShellSender({
        frameUrl: `${SHELL_URL}?a=1#b`,
        isMainFrame: true,
        shellUrl: SHELL_URL,
      }),
    ).toBe(true);
  });

  it.each([
    ['the developer origin', 'http://127.0.0.1:5000/auth'],
    ['another file page', 'file:///app/out/renderer/other.html'],
    ['a data URL', 'data:text/html,hi'],
    ['garbage', 'not a url'],
  ])('rejects %s', (_name, frameUrl) => {
    expect(
      isShellSender({ frameUrl, isMainFrame: true, shellUrl: SHELL_URL }),
    ).toBe(false);
  });

  it('rejects a subframe, a gone frame', () => {
    expect(
      isShellSender({
        frameUrl: SHELL_URL,
        isMainFrame: false,
        shellUrl: SHELL_URL,
      }),
    ).toBe(false);
    expect(
      isShellSender({
        frameUrl: undefined,
        isMainFrame: true,
        shellUrl: SHELL_URL,
      }),
    ).toBe(false);
  });
});
