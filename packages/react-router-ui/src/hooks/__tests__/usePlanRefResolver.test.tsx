import * as React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  usePlanRefResolver,
  type PlanRefResolverData,
} from '../usePlanRefResolver';

const FULL_UUID = 'f5e40886-36d3-4886-9781-9722e0b9217b';

function Harness(props: {
  readonly data?: PlanRefResolverData;
  readonly load: (prefix: string) => void;
  readonly query: string;
  readonly state?: 'idle' | 'loading' | 'submitting';
}) {
  const { loading, matches } = usePlanRefResolver({
    data: props.data,
    load: props.load,
    query: props.query,
    state: props.state ?? 'idle',
  });

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="match-ids">{matches.map((m) => m.id).join(',')}</span>
    </div>
  );
}

describe('usePlanRefResolver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('debounces the lookup for a short fragment', async () => {
    const load = vi.fn();
    render(<Harness load={load} query="f5e40886" />);

    // Pending immediately, lookup not yet fired.
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(load).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(249);
    });
    expect(load).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(load).toHaveBeenCalledExactlyOnceWith('f5e40886');
  });

  test('does not look up a full UUID', async () => {
    const load = vi.fn();
    render(<Harness load={load} query={FULL_UUID} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(load).not.toHaveBeenCalled();
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  test('does not look up too-short or non-hex input', async () => {
    const load = vi.fn();
    const { rerender } = render(<Harness load={load} query="f5e4" />);
    rerender(<Harness load={load} query="plans-index" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(load).not.toHaveBeenCalled();
  });

  test('surfaces matches only when data.prefix matches the current query', async () => {
    const load = vi.fn();
    const stale: PlanRefResolverData = {
      matches: [{ id: 'stale-id', status: 'pending', title: 'Stale' }],
      prefix: 'deadbeef',
    };
    const { rerender } = render(
      <Harness data={stale} load={load} query="f5e40886" />,
    );

    // data is for a different prefix → nothing surfaced, still loading.
    expect(screen.getByTestId('match-ids')).toHaveTextContent('');

    const fresh: PlanRefResolverData = {
      matches: [{ id: FULL_UUID, status: 'in_progress', title: 'Real plan' }],
      prefix: 'f5e40886',
    };
    rerender(<Harness data={fresh} load={load} query="f5e40886" />);

    expect(screen.getByTestId('match-ids')).toHaveTextContent(FULL_UUID);
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  test('reports loading while the transport is in flight', () => {
    const load = vi.fn();
    render(<Harness load={load} query="f5e40886" state="loading" />);

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });
});
