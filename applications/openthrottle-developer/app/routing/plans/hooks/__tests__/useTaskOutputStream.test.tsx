import * as React from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useTaskOutputStream } from '../useTaskOutputStream';

// Controllable fake graphql-ws client: capture the subscription sink so the
// test can push deltas, mirroring usePlanOutputStream's test harness.
const shared = vi.hoisted(() => {
  const sinks: Array<{ next: (m: unknown) => void }> = [];
  return {
    client: {
      subscribe: (_payload: unknown, sink: { next: (m: unknown) => void }) => {
        sinks.push(sink);
        return () => undefined;
      },
    },
    sinks,
  };
});

vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => shared.client,
}));

interface Chunk {
  content: string;
  createdAt: string;
  id: string;
  iteration: number | null;
  planId: string;
  taskId: string;
}

const chunk = (id: string, createdAt: string, taskId: string): Chunk => ({
  content: `c-${id}`,
  createdAt,
  id,
  iteration: null,
  planId: 'p1',
  taskId,
});

function Harness(props: {
  readonly planId: string;
  readonly seed: Chunk[];
  readonly taskId: string;
}): React.ReactElement {
  const chunks = useTaskOutputStream(props.planId, props.taskId, props.seed);
  return <div data-testid="ids">{chunks.map((c) => c.id).join(',')}</div>;
}

const pushDelta = (c: Chunk): void => {
  act(() => {
    shared.sinks[shared.sinks.length - 1]?.next({
      data: { planOutputChunkAdded: c },
    });
  });
};

describe('useTaskOutputStream', () => {
  test('filters the seed to the given taskId, sorted by createdAt', () => {
    const component = render(
      <Harness
        planId="p1"
        seed={[
          chunk('b', '2026-01-01T00:00:02Z', 't1'),
          chunk('a', '2026-01-01T00:00:01Z', 't1'),
          chunk('other', '2026-01-01T00:00:00Z', 't2'),
        ]}
        taskId="t1"
      />,
    );
    expect(component.getByTestId('ids').textContent).toBe('a,b');
  });

  test('appends subscription deltas for the matching task only, deduping by id', () => {
    const component = render(
      <Harness
        planId="p1"
        seed={[chunk('a', '2026-01-01T00:00:01Z', 't1')]}
        taskId="t1"
      />,
    );

    pushDelta(chunk('other-task', '2026-01-01T00:00:02Z', 't2'));
    expect(component.getByTestId('ids').textContent).toBe('a');

    pushDelta(chunk('b', '2026-01-01T00:00:03Z', 't1'));
    expect(component.getByTestId('ids').textContent).toBe('a,b');

    // Duplicate id is ignored.
    pushDelta(chunk('b', '2026-01-01T00:00:03Z', 't1'));
    expect(component.getByTestId('ids').textContent).toBe('a,b');
  });

  test('resets the accumulated map when the taskId changes', () => {
    const component = render(
      <Harness
        planId="p1"
        seed={[chunk('a', '2026-01-01T00:00:01Z', 't1')]}
        taskId="t1"
      />,
    );
    pushDelta(chunk('live', '2026-01-01T00:00:05Z', 't1'));
    expect(component.getByTestId('ids').textContent).toBe('a,live');

    component.rerender(
      <Harness
        planId="p1"
        seed={[chunk('x', '2026-01-01T00:00:01Z', 't2')]}
        taskId="t2"
      />,
    );

    // Switching tasks drops t1's accumulated chunks entirely.
    expect(component.getByTestId('ids').textContent).toBe('x');
  });
});
