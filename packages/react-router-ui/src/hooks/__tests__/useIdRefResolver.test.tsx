import { act, render } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { IdRefResolverData } from '../../types';
import { useIdRefResolver } from '../useIdRefResolver';

const FULL_UUID = 'f5e40886-36d3-4886-9781-9722e0b9217b';
const FULL_HEX = FULL_UUID.replace(/-/g, '');

const Harness = (props: {
  readonly data?: IdRefResolverData;
  readonly load: (ref: string) => void;
  readonly query: string;
  readonly state?: 'idle' | 'loading' | 'submitting';
}): React.ReactElement => {
  const { loading, matches } = useIdRefResolver({
    data: props.data,
    debounceMs: undefined,
    load: props.load,
    query: props.query,
    state: props.state ?? 'idle',
  });

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="match-ids">
        {matches.map((m) => `${m.kind}:${m.id}`).join(',')}
      </span>
    </div>
  );
};

describe('useIdRefResolver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('short fragment', () => {
    test('debounces the lookup with the normalized fragment', async () => {
      const load = vi.fn();
      const component = render(<Harness load={load} query="F5E40886" />);

      expect(component.getByTestId('loading')).toHaveTextContent('true');
      expect(load).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });

      expect(load).toHaveBeenCalledExactlyOnceWith('f5e40886');
    });
  });

  describe('full UUID', () => {
    test('looks up all 32 hex characters', async () => {
      const load = vi.fn();
      render(<Harness load={load} query={FULL_UUID} />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });

      expect(load).toHaveBeenCalledExactlyOnceWith(FULL_HEX);
    });

    test('surfaces plan and task matches for the UUID', () => {
      const data: IdRefResolverData = {
        matches: [
          {
            id: FULL_UUID,
            kind: 'TASK',
            planId: 'plan-1',
            planTitle: 'Parent',
            status: 'PENDING',
            title: 'Task',
          },
        ],
        ref: FULL_HEX,
      };
      const component = render(
        <Harness data={data} load={vi.fn()} query={FULL_UUID} />,
      );

      expect(component.getByTestId('match-ids')).toHaveTextContent(
        `TASK:${FULL_UUID}`,
      );
      expect(component.getByTestId('loading')).toHaveTextContent('false');
    });
  });

  describe('non-id input', () => {
    test('never looks up too-short or non-hex text', async () => {
      const load = vi.fn();
      const component = render(<Harness load={load} query="f5e4" />);
      component.rerender(<Harness load={load} query="plans-index" />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(load).not.toHaveBeenCalled();
      expect(component.getByTestId('loading')).toHaveTextContent('false');
    });
  });

  describe('stale data', () => {
    test('ignores matches resolved for a different ref', () => {
      const stale: IdRefResolverData = {
        matches: [
          { id: 'stale', kind: 'PLAN', status: 'PENDING', title: 'Old' },
        ],
        ref: 'deadbeef',
      };
      const component = render(
        <Harness data={stale} load={vi.fn()} query="f5e40886" />,
      );

      expect(component.getByTestId('match-ids')).toHaveTextContent('');
      expect(component.getByTestId('loading')).toHaveTextContent('true');
    });
  });

  describe('transport in flight', () => {
    test('reports loading while the fetcher is loading', () => {
      const component = render(
        <Harness load={vi.fn()} query="f5e40886" state="loading" />,
      );

      expect(component.getByTestId('loading')).toHaveTextContent('true');
    });
  });
});
