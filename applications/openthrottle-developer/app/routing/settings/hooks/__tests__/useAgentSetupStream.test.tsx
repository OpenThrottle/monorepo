import * as React from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useAgentSetupStream } from '../useAgentSetupStream';

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
  done: boolean;
  error: string | null;
  id: string;
  runId: string;
  sortOrder: number;
}

const chunk = (
  id: string,
  sortOrder: number,
  options?: { readonly done?: boolean; readonly error?: string | null },
): Chunk => ({
  content: `c-${id}`,
  done: options?.done ?? false,
  error: options?.error ?? null,
  id,
  runId: 'run-1',
  sortOrder,
});

function Harness(props: { readonly runId: string | null }): React.ReactElement {
  const state = useAgentSetupStream(props.runId);
  return (
    <div>
      <div data-testid="ids">{state.chunks.map((c) => c.id).join(',')}</div>
      <div data-testid="done">{state.done ? 'yes' : 'no'}</div>
      <div data-testid="error">{state.error ?? 'none'}</div>
    </div>
  );
}

const pushDelta = (c: Chunk): void => {
  act(() => {
    shared.sinks[shared.sinks.length - 1]?.next({
      data: { agentSetupChunkAdded: c },
    });
  });
};

describe('useAgentSetupStream', () => {
  test('is inert with a null runId: no subscription, empty state', () => {
    const sinkCountBefore = shared.sinks.length;
    const component = render(<Harness runId={null} />);

    expect(component.getByTestId('ids').textContent).toBe('');
    expect(component.getByTestId('done')).toHaveTextContent('no');
    expect(component.getByTestId('error')).toHaveTextContent('none');
    expect(shared.sinks.length).toBe(sinkCountBefore);
  });

  test('accumulates chunks ordered by sortOrder and dedupes by id', () => {
    const component = render(<Harness runId="run-1" />);

    pushDelta(chunk('b', 2));
    pushDelta(chunk('a', 1));
    expect(component.getByTestId('ids').textContent).toBe('a,b');

    // Duplicate id is ignored.
    pushDelta(chunk('a', 1));
    expect(component.getByTestId('ids').textContent).toBe('a,b');
  });

  test('flags done + error once a terminal chunk arrives', () => {
    const component = render(<Harness runId="run-1" />);

    pushDelta(chunk('a', 1));
    expect(component.getByTestId('done')).toHaveTextContent('no');

    pushDelta(chunk('b', 2, { done: true, error: 'install failed' }));

    expect(component.getByTestId('done')).toHaveTextContent('yes');
    expect(component.getByTestId('error')).toHaveTextContent('install failed');
  });

  test('resets accumulated chunks when the runId changes', () => {
    const component = render(<Harness runId="run-1" />);
    pushDelta(chunk('a', 1));
    expect(component.getByTestId('ids').textContent).toBe('a');

    component.rerender(<Harness runId="run-2" />);

    expect(component.getByTestId('ids').textContent).toBe('');
    expect(component.getByTestId('done')).toHaveTextContent('no');
  });
});
