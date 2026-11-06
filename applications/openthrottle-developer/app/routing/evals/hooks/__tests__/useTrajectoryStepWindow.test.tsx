import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { useTrajectoryStepWindow } from '../useTrajectoryStepWindow';

describe('useTrajectoryStepWindow', () => {
  test('starts at one batch and grows a batch at a time', () => {
    const { result } = renderHook(() => {
      return useTrajectoryStepWindow({ batchSize: 100, total: 250 });
    });

    expect(result.current.visibleCount).toBe(100);
    expect(result.current.hasMore).toBe(true);

    act(() => {
      result.current.onShowMore();
    });

    expect(result.current.visibleCount).toBe(200);

    act(() => {
      result.current.onShowMore();
    });

    expect(result.current.visibleCount).toBe(250);
    expect(result.current.hasMore).toBe(false);
  });

  test('shows everything on onShowAll', () => {
    const { result } = renderHook(() => {
      return useTrajectoryStepWindow({ batchSize: 100, total: 600 });
    });

    act(() => {
      result.current.onShowAll();
    });

    expect(result.current.visibleCount).toBe(600);
    expect(result.current.hasMore).toBe(false);
  });

  test('never reports more than the total', () => {
    const { result } = renderHook(() => {
      return useTrajectoryStepWindow({ batchSize: 100, total: 3 });
    });

    expect(result.current.visibleCount).toBe(3);
    expect(result.current.hasMore).toBe(false);
  });
});
