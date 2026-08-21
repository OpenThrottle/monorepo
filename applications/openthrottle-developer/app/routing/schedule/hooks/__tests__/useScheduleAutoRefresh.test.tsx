import * as React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useScheduleAutoRefresh } from '~/routing/schedule/hooks/useScheduleAutoRefresh';

const revalidate = vi.fn();
let revalidatorState = 'idle';

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useRevalidator: () => ({ revalidate, state: revalidatorState }),
  };
});

const Probe = (props: { inFlightCount: number }): React.ReactElement => {
  useScheduleAutoRefresh(props.inFlightCount);
  return <span data-testid="probe" />;
};

/**
 * `useRevalidator` is mocked, so the probe needs no router context — and rendering it directly is
 * what lets a re-render keep the same component instance. Wrapping it in a fresh routes stub would
 * remount it, resetting the hook's refs and hiding the in-flight → idle transition entirely.
 */
const renderProbe = (
  inFlightCount: number,
): ReturnType<typeof render> & { rerenderWith: (next: number) => void } => {
  const result = render(<Probe inFlightCount={inFlightCount} />);

  return {
    ...result,
    rerenderWith: (next: number) => {
      result.rerender(<Probe inFlightCount={next} />);
    },
  };
};

const setVisibility = (state: 'hidden' | 'visible'): void => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useScheduleAutoRefresh', () => {
  beforeEach(() => {
    revalidate.mockClear();
    revalidatorState = 'idle';
    vi.useFakeTimers();
    setVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('never polls while nothing is in flight', () => {
    renderProbe(0);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(revalidate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  test('revalidates on the interval while work is in flight', () => {
    renderProbe(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(revalidate).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(revalidate).toHaveBeenCalledTimes(2);
  });

  test('skips a tick while a revalidation is already in flight', () => {
    revalidatorState = 'loading';
    renderProbe(1);

    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    expect(revalidate).not.toHaveBeenCalled();
  });

  test('does not poll a hidden tab, and catches up once it becomes visible', () => {
    renderProbe(1);

    setVisibility('hidden');
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(revalidate).not.toHaveBeenCalled();

    act(() => {
      setVisibility('visible');
    });
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  test('takes one final reading when the last run finishes, then stops', () => {
    const probe = renderProbe(1);

    act(() => {
      probe.rerenderWith(0);
    });

    expect(revalidate).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  test('clears the interval on unmount', () => {
    const probe = renderProbe(1);

    probe.unmount();
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(revalidate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
