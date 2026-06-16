import { act, render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { usePlanOutputStream } from '../usePlanOutputStream';

// Controllable fake graphql-ws client: capture the subscription sink so the test
// can push deltas, and let the hook resolve it via the service singleton.
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

type Chunk = {
  content: string;
  createdAt: string;
  id: string;
  iteration: number | null;
  planId: string;
};

const chunk = (id: string, createdAt: string): Chunk => ({
  content: `c-${id}`,
  createdAt,
  id,
  iteration: null,
  planId: 'p1',
});

function Harness(props: { seed: Chunk[] }): React.ReactElement {
  const chunks = usePlanOutputStream('p1', props.seed);
  return <div data-testid="ids">{chunks.map((c) => c.id).join(',')}</div>;
}

const pushDelta = (c: Chunk): void => {
  act(() => {
    shared.sinks[shared.sinks.length - 1]?.next({
      data: { planOutputChunkAdded: c },
    });
  });
};

describe('usePlanOutputStream', () => {
  test('renders the loader seed sorted by createdAt', () => {
    const component = render(
      <Harness
        seed={[
          chunk('b', '2026-01-01T00:00:02Z'),
          chunk('a', '2026-01-01T00:00:01Z'),
        ]}
      />,
    );
    expect(component.getByTestId('ids').textContent).toBe('a,b');
  });

  test('appends subscription deltas and dedupes by id', () => {
    const component = render(
      <Harness seed={[chunk('a', '2026-01-01T00:00:01Z')]} />,
    );

    pushDelta(chunk('b', '2026-01-01T00:00:03Z'));
    expect(component.getByTestId('ids').textContent).toBe('a,b');

    // Duplicate id (already present) is ignored; ordering stays by createdAt.
    pushDelta(chunk('b', '2026-01-01T00:00:03Z'));
    pushDelta(chunk('c', '2026-01-01T00:00:02Z'));
    expect(component.getByTestId('ids').textContent).toBe('a,c,b');
  });

  test('re-seeds from a new loader snapshot without dropping live deltas', () => {
    const component = render(
      <Harness seed={[chunk('a', '2026-01-01T00:00:01Z')]} />,
    );
    pushDelta(chunk('live', '2026-01-01T00:00:05Z'));
    expect(component.getByTestId('ids').textContent).toBe('a,live');

    // Revalidation delivers a fresh snapshot (now includes the persisted 'live').
    component.rerender(
      <Harness
        seed={[
          chunk('a', '2026-01-01T00:00:01Z'),
          chunk('b', '2026-01-01T00:00:02Z'),
          chunk('live', '2026-01-01T00:00:05Z'),
        ]}
      />,
    );
    expect(component.getByTestId('ids').textContent).toBe('a,b,live');
  });
});
