import { describe, expect, it } from 'vitest';

import {
  awaitAcpPermission,
  resolveAcpPermission,
} from '../permission-broker.ts';

describe('permission broker', () => {
  describe('resolveAcpPermission', () => {
    it('settles a pending request with the chosen option', async () => {
      const pending = awaitAcpPermission('r1', undefined);

      expect(resolveAcpPermission('r1', 'yes')).toBe(true);
      await expect(pending).resolves.toEqual({
        outcome: { optionId: 'yes', outcome: 'selected' },
      });
    });

    it('settles as cancelled for a null option', async () => {
      const pending = awaitAcpPermission('r2', undefined);

      expect(resolveAcpPermission('r2', null)).toBe(true);
      await expect(pending).resolves.toEqual({
        outcome: { outcome: 'cancelled' },
      });
    });

    it('returns false for an unknown id and for an already settled one', async () => {
      const pending = awaitAcpPermission('r3', undefined);
      resolveAcpPermission('r3', 'yes');
      await pending;

      expect(resolveAcpPermission('r3', 'yes')).toBe(false);
      expect(resolveAcpPermission('never-registered', 'yes')).toBe(false);
    });
  });

  describe('abort', () => {
    it('settles a pending request as cancelled', async () => {
      const controller = new AbortController();
      const pending = awaitAcpPermission('r4', controller.signal);

      controller.abort();

      await expect(pending).resolves.toEqual({
        outcome: { outcome: 'cancelled' },
      });
      expect(resolveAcpPermission('r4', 'yes')).toBe(false);
    });

    it('settles immediately when the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        awaitAcpPermission('r5', controller.signal),
      ).resolves.toEqual({ outcome: { outcome: 'cancelled' } });
    });
  });
});
