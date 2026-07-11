import { describe, expect, it } from 'vitest';
import { resolveCompletedAtForStatusChange } from './completed-at';

describe('resolveCompletedAtForStatusChange', () => {
  const fixedNow = new Date('2026-07-10T12:00:00.000Z');
  const existing = new Date('2026-06-01T08:00:00.000Z');

  describe('transition into COMPLETED', () => {
    it('stamps now when entering COMPLETED from another status', () => {
      expect(
        resolveCompletedAtForStatusChange({
          currentCompletedAt: null,
          nextStatus: 'COMPLETED',
          now: fixedNow,
          previousStatus: 'IN_PROGRESS',
        }),
      ).toBe(fixedNow);
    });

    it('normalizes case when detecting the COMPLETED transition', () => {
      expect(
        resolveCompletedAtForStatusChange({
          currentCompletedAt: null,
          nextStatus: 'completed',
          now: fixedNow,
          previousStatus: 'pending',
        }),
      ).toBe(fixedNow);
    });
  });

  describe('already COMPLETED', () => {
    it('does not overwrite completedAt on idempotent COMPLETED → COMPLETED', () => {
      expect(
        resolveCompletedAtForStatusChange({
          currentCompletedAt: existing,
          nextStatus: 'COMPLETED',
          now: fixedNow,
          previousStatus: 'COMPLETED',
        }),
      ).toBe(existing);
    });

    it('keeps completedAt when status is unchanged and already COMPLETED', () => {
      expect(
        resolveCompletedAtForStatusChange({
          currentCompletedAt: existing,
          nextStatus: 'completed',
          now: fixedNow,
          previousStatus: 'COMPLETED',
        }),
      ).toBe(existing);
    });
  });

  describe('leaving COMPLETED', () => {
    it('clears completedAt when status leaves COMPLETED', () => {
      expect(
        resolveCompletedAtForStatusChange({
          currentCompletedAt: existing,
          nextStatus: 'IN_PROGRESS',
          now: fixedNow,
          previousStatus: 'COMPLETED',
        }),
      ).toBeNull();
    });

    it('clears completedAt when reverting to PENDING', () => {
      expect(
        resolveCompletedAtForStatusChange({
          currentCompletedAt: existing,
          nextStatus: 'PENDING',
          now: fixedNow,
          previousStatus: 'COMPLETED',
        }),
      ).toBeNull();
    });
  });

  describe('non-completion transitions', () => {
    it('leaves null completedAt unchanged for PENDING → IN_PROGRESS', () => {
      expect(
        resolveCompletedAtForStatusChange({
          currentCompletedAt: null,
          nextStatus: 'IN_PROGRESS',
          now: fixedNow,
          previousStatus: 'PENDING',
        }),
      ).toBeNull();
    });

    it('preserves a stale completedAt only when not leaving COMPLETED', () => {
      // Defensive: non-COMPLETED rows should already be null; helper does not invent clears.
      expect(
        resolveCompletedAtForStatusChange({
          currentCompletedAt: existing,
          nextStatus: 'IN_PROGRESS',
          now: fixedNow,
          previousStatus: 'PENDING',
        }),
      ).toBe(existing);
    });
  });
});
