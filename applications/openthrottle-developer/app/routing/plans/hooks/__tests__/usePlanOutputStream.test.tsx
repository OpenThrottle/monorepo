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

function Harness(props: { seed: Chunk[] | undefined }): React.ReactElement {
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

  // 🚨 The deferred-snapshot cases. `outputChunks` is now a loader promise, so on
  // an actively-running plan the subscription WILL deliver chunks before the
  // snapshot lands. Neither source is "first" and neither may drop the other.
  test('keeps deltas that arrive before the snapshot resolves', () => {
    const component = render(<Harness seed={undefined} />);

    // Output written during the load window: the subscription must already be
    // open, or this chunk is lost until the next revalidation.
    pushDelta(chunk('live-1', '2026-01-01T00:00:03Z'));
    pushDelta(chunk('live-2', '2026-01-01T00:00:04Z'));
    expect(component.getByTestId('ids').textContent).toBe('live-1,live-2');

    // The snapshot finally lands and is unioned in, not swapped in.
    component.rerender(
      <Harness
        seed={[
          chunk('a', '2026-01-01T00:00:01Z'),
          chunk('b', '2026-01-01T00:00:02Z'),
        ]}
      />,
    );
    expect(component.getByTestId('ids').textContent).toBe('a,b,live-1,live-2');
  });

  test('produces the same result whichever source arrives first', () => {
    const seed = [
      chunk('a', '2026-01-01T00:00:01Z'),
      chunk('b', '2026-01-01T00:00:02Z'),
    ];

    // Snapshot first, then the delta.
    const snapshotFirst = render(<Harness seed={seed} />);
    pushDelta(chunk('live', '2026-01-01T00:00:03Z'));
    const snapshotFirstIds = snapshotFirst.getByTestId('ids').textContent;
    snapshotFirst.unmount();

    // Delta first, then the snapshot.
    const deltaFirst = render(<Harness seed={undefined} />);
    pushDelta(chunk('live', '2026-01-01T00:00:03Z'));
    deltaFirst.rerender(<Harness seed={seed} />);

    expect(deltaFirst.getByTestId('ids').textContent).toBe(snapshotFirstIds);
    expect(snapshotFirstIds).toBe('a,b,live');
  });

  test('a chunk delivered by both sources appears exactly once', () => {
    const component = render(<Harness seed={undefined} />);

    pushDelta(chunk('shared', '2026-01-01T00:00:02Z'));
    component.rerender(
      <Harness
        seed={[
          chunk('a', '2026-01-01T00:00:01Z'),
          chunk('shared', '2026-01-01T00:00:02Z'),
        ]}
      />,
    );

    expect(component.getByTestId('ids').textContent).toBe('a,shared');
  });

  test('orders by iteration first, falling back to createdAt', () => {
    const numbered = (id: string, iteration: number, createdAt: string) => ({
      ...chunk(id, createdAt),
      iteration,
    });

    // createdAt alone would order these third,first,second — iteration wins.
    const component = render(
      <Harness
        seed={[
          numbered('third', 3, '2026-01-01T00:00:01Z'),
          numbered('first', 1, '2026-01-01T00:00:09Z'),
          numbered('second', 2, '2026-01-01T00:00:05Z'),
        ]}
      />,
    );

    expect(component.getByTestId('ids').textContent).toBe('first,second,third');
  });

  test('does not reorder when only one side carries an iteration', () => {
    // A missing iteration must not be treated as 0 and hoisted to the front;
    // createdAt decides instead, which is the order the resolver returns.
    const component = render(
      <Harness
        seed={[
          { ...chunk('early', '2026-01-01T00:00:01Z'), iteration: null },
          { ...chunk('late', '2026-01-01T00:00:02Z'), iteration: 7 },
        ]}
      />,
    );

    expect(component.getByTestId('ids').textContent).toBe('early,late');
  });
});
