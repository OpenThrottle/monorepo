import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  beginScopedSession,
  clearCurrentSession,
  ensureWorkSession,
  getCurrentSessionId,
} from '../current-session.ts';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const mockExecute = vi.mocked(executeGraphqlWithAuth);

describe('ensureWorkSession', () => {
  beforeEach(() => {
    clearCurrentSession();
    mockExecute.mockReset();
  });

  describe('when the open succeeds', () => {
    it('returns and remembers the session id', async () => {
      mockExecute.mockResolvedValueOnce({ startWorkSession: { id: 'sess-1' } });

      await expect(ensureWorkSession('token')).resolves.toBe('sess-1');
      expect(getCurrentSessionId()).toBe('sess-1');
    });

    it('shares one in-flight open between concurrent callers', async () => {
      mockExecute.mockResolvedValueOnce({ startWorkSession: { id: 'sess-1' } });

      const ids = await Promise.all([
        ensureWorkSession('token'),
        ensureWorkSession('token'),
      ]);

      expect(ids).toEqual(['sess-1', 'sess-1']);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the open fails', () => {
    it('resolves null, then retries on the next call', async () => {
      mockExecute.mockRejectedValueOnce(new Error('boom'));
      mockExecute.mockResolvedValueOnce({ startWorkSession: { id: 'sess-2' } });

      await expect(ensureWorkSession('token')).resolves.toBeNull();
      expect(getCurrentSessionId()).toBeNull();
      await expect(ensureWorkSession('token')).resolves.toBe('sess-2');
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });
  });
});

describe('beginScopedSession', () => {
  beforeEach(() => {
    clearCurrentSession();
    mockExecute.mockReset();
  });

  it('opens a fresh session and returns its id', async () => {
    mockExecute.mockResolvedValueOnce({ startWorkSession: { id: 'sess-3' } });

    await expect(beginScopedSession('token')).resolves.toBe('sess-3');
  });

  it('returns null when opening fails', async () => {
    mockExecute.mockRejectedValueOnce(new Error('boom'));

    await expect(beginScopedSession('token')).resolves.toBeNull();
    expect(getCurrentSessionId()).toBeNull();
  });
});
