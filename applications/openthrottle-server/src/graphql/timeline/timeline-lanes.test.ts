/**
 * @description Unit tests for timeline lane-key derivation across the three
 * grouping modes, including the fallbacks that keep unattributable rows in one
 * shared lane rather than N single-row lanes.
 */

import { describe, expect, it } from 'vitest';
import { TimelineLaneGrouping } from './timeline.enum';
import { resolveTimelineLane } from './timeline-lanes';

describe('resolveTimelineLane', () => {
  describe('BY_PLAN', () => {
    it('keys on the plan and labels with its title', () => {
      const lane = resolveTimelineLane(TimelineLaneGrouping.BY_PLAN, {
        planId: 'plan-1',
        planTitle: 'Plan One',
      });

      expect(lane).toEqual({ key: 'plan:plan-1', label: 'Plan One' });
    });

    it('falls back to the id when the plan has no title', () => {
      const lane = resolveTimelineLane(TimelineLaneGrouping.BY_PLAN, {
        planId: 'plan-1',
        planTitle: '',
      });

      expect(lane.label).toBe('plan-1');
    });

    it('collapses a row with no plan into the shared lane', () => {
      const lane = resolveTimelineLane(TimelineLaneGrouping.BY_PLAN, {
        backend: 'claude',
        planId: null,
      });

      expect(lane.key).toBe('unattributed');
    });

    it('honours the fixed lanes for sources with no plan link', () => {
      expect(
        resolveTimelineLane(TimelineLaneGrouping.BY_PLAN, {}, 'skills').key,
      ).toBe('skills');
      expect(
        resolveTimelineLane(TimelineLaneGrouping.BY_PLAN, {}, 'scheduled').key,
      ).toBe('scheduled');
    });
  });

  describe('BY_CHECKOUT', () => {
    it('prefers the checkout id', () => {
      const lane = resolveTimelineLane(TimelineLaneGrouping.BY_CHECKOUT, {
        branch: 'feat/x',
        checkoutId: 'checkout-1',
      });

      expect(lane.key).toBe('checkout:checkout-1');
    });

    it('falls back to the branch when no checkout resolved', () => {
      const lane = resolveTimelineLane(TimelineLaneGrouping.BY_CHECKOUT, {
        branch: 'feat/x',
        checkoutId: null,
      });

      expect(lane).toEqual({ key: 'branch:feat/x', label: 'feat/x' });
    });

    it('collapses when it has neither', () => {
      const lane = resolveTimelineLane(TimelineLaneGrouping.BY_CHECKOUT, {
        planId: 'plan-1',
      });

      expect(lane.key).toBe('unattributed');
    });

    it('ignores the fixed-lane override — a scheduled run knows its checkout', () => {
      const lane = resolveTimelineLane(
        TimelineLaneGrouping.BY_CHECKOUT,
        { checkoutId: 'checkout-1' },
        'scheduled',
      );

      expect(lane.key).toBe('checkout:checkout-1');
    });
  });

  describe('BY_BACKEND', () => {
    it('keys on the backend', () => {
      const lane = resolveTimelineLane(TimelineLaneGrouping.BY_BACKEND, {
        backend: 'claude',
      });

      expect(lane).toEqual({ key: 'backend:claude', label: 'claude' });
    });

    it('collapses a row that carries no backend, such as a task marker', () => {
      const lane = resolveTimelineLane(TimelineLaneGrouping.BY_BACKEND, {
        planId: 'plan-1',
        planTitle: 'Plan One',
      });

      expect(lane.key).toBe('unattributed');
    });
  });
});
