import * as React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useElapsedTicker } from '~/routing/schedule/hooks/useElapsedTicker';

const Probe = (props: { enabled: boolean }): React.ReactElement => {
  const now = useElapsedTicker(props.enabled);
  return <span data-testid="now">{now}</span>;
};

describe('useElapsedTicker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('advances once a second while enabled', () => {
    const component = render(<Probe enabled={true} />);

    expect(component.getByTestId('now')).toHaveTextContent(
      '2026-08-21T12:00:00.000Z',
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(component.getByTestId('now')).toHaveTextContent(
      '2026-08-21T12:00:02.000Z',
    );
  });

  test('never starts an interval while disabled', () => {
    const component = render(<Probe enabled={false} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(component.getByTestId('now')).toHaveTextContent(
      '2026-08-21T12:00:00.000Z',
    );
  });

  test('clears the interval on unmount, so no update lands after teardown', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const component = render(<Probe enabled={true} />);

    component.unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(errors).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    errors.mockRestore();
  });
});
