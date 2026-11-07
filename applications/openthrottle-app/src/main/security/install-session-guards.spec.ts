import { describe, expect, it, vi } from 'vitest';

import { installSessionGuards } from './install-security-guards.ts';

const buildSession = () => {
  return {
    setPermissionCheckHandler: vi.fn(),
    setPermissionRequestHandler: vi.fn(),
  };
};

describe('installSessionGuards', () => {
  it('sets both permission handlers on the given session', () => {
    const session = buildSession();

    installSessionGuards(session, { getAllowedOrigins: () => [] });

    expect(session.setPermissionRequestHandler).toHaveBeenCalledTimes(1);
    expect(session.setPermissionCheckHandler).toHaveBeenCalledTimes(1);
  });

  it('denies everything for a request from the shell file origin', () => {
    const session = buildSession();

    installSessionGuards(session, {
      getAllowedOrigins: () => ['http://127.0.0.1:1'],
    });

    const handler = session.setPermissionRequestHandler.mock.calls[0]?.[0];
    const callback = vi.fn();

    handler?.(undefined, 'notifications', callback, {
      requestingUrl: 'file:///app/out/renderer/index.html',
    });

    expect(callback).toHaveBeenCalledWith(false);
  });
});
