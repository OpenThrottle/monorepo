/**
 * @description Tests for Cortex Ralph client (connectivity check).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const mockConfig = { connectionString: 'postgres://localhost/cortex' };

const mockState = { connectReject: undefined as Error | undefined };

vi.mock('pg', () => ({
  default: {
    Client: class {
      connect(): Promise<void> {
        return mockState.connectReject
          ? Promise.reject(mockState.connectReject)
          : Promise.resolve();
      }

      end(): Promise<void> {
        return Promise.resolve();
      }

      query(): Promise<{ rows: unknown[] }> {
        return Promise.resolve({ rows: [{}] });
      }
    },
  },
}));

describe('ensureCortexReachable', () => {
  afterEach(() => {
    mockState.connectReject = undefined;
  });

  it('throws with clear message when connection fails', async () => {
    mockState.connectReject = new Error('Connection refused');
    const { ensureCortexReachable } = await import('../cortex-ralph.js');

    await expect(ensureCortexReachable(mockConfig)).rejects.toThrow(
      /Cortex database is unreachable/,
    );
    await expect(ensureCortexReachable(mockConfig)).rejects.toThrow(
      /Connection refused/,
    );
  });

  it('resolves when connection and SELECT 1 succeed', async () => {
    const { ensureCortexReachable } = await import('../cortex-ralph.js');

    await expect(ensureCortexReachable(mockConfig)).resolves.toBeUndefined();
  });
});
