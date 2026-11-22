import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { useScheduleAutoRefresh } from '~/routing/schedule/hooks/useScheduleAutoRefresh';

import { useProjectRunAutoRefresh } from '../useProjectRunAutoRefresh';

vi.mock('~/routing/schedule/hooks/useScheduleAutoRefresh', () => ({
  useScheduleAutoRefresh: vi.fn(),
}));

describe('useProjectRunAutoRefresh', () => {
  beforeEach(() => {
    vi.mocked(useScheduleAutoRefresh).mockClear();
  });

  describe('while the run is active', () => {
    test('polls as one run in flight', () => {
      renderHook(() => useProjectRunAutoRefresh({ isActive: true }));

      expect(useScheduleAutoRefresh).toHaveBeenCalledWith(1);
    });
  });

  describe('while no run is active', () => {
    test('does not poll', () => {
      renderHook(() => useProjectRunAutoRefresh({ isActive: false }));

      expect(useScheduleAutoRefresh).toHaveBeenCalledWith(0);
    });
  });
});
