import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { parse } from 'graphql';
import { render } from '@testing-library/react';
import * as React from 'react';
import { type Mock, afterEach, describe, expect, it, vi } from 'vitest';
import type { GraphqlWsClient } from '../createGraphqlWsClient';
import { useSubscription } from '../useSubscription';

/**
 * Present a structural test double as its real type. The public overload hands
 * the caller `T`; the implementation stays `unknown`-typed, so the mock
 * boundary needs no `as` cast. (graphql-ws' `Client` is a wide third-party
 * interface we only partially implement here.)
 */
function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

// A minimal typed subscription document (the `query` string is what graphql-ws
// sees). `parse` returns a `DocumentNode`, which is assignable to the branded
// `TypedDocumentNode` (its phantom `__apiType` marker is optional).
const DOCUMENT: TypedDocumentNode<
  { planOutputChunkAdded: { id: string } },
  { planId: string }
> = parse(
  'subscription P($planId: ID!){ planOutputChunkAdded(planId: $planId){ id } }',
);

interface SubscribeArgs {
  complete: () => void;
  error: (e: unknown) => void;
  next: (msg: { data?: { planOutputChunkAdded: { id: string } } }) => void;
}

type SubscribePayload = {
  query: string;
  variables: { planId: string };
};

function makeClient(): {
  client: GraphqlWsClient;
  dispose: ReturnType<typeof vi.fn>;
  subscribe: Mock<
    (payload: SubscribePayload, sink: SubscribeArgs) => () => void
  >;
} {
  const dispose = vi.fn();
  const subscribe = vi.fn<
    (payload: SubscribePayload, sink: SubscribeArgs) => () => void
  >(() => dispose);
  const client = asMock<GraphqlWsClient>({ subscribe });
  return { client, dispose, subscribe };
}

function Harness(props: {
  client: GraphqlWsClient | null;
  enabled?: boolean;
  onData: (d: { planOutputChunkAdded: { id: string } }) => void;
}): React.ReactElement {
  useSubscription(
    props.client,
    DOCUMENT,
    { planId: 'p1' },
    { onData: props.onData },
    props.enabled ?? true,
  );
  return React.createElement('div');
}

afterEach(() => vi.clearAllMocks());

describe('useSubscription', () => {
  it('does not subscribe when the client is null (SSR)', () => {
    const onData = vi.fn();
    render(React.createElement(Harness, { client: null, onData }));
    expect(onData).not.toHaveBeenCalled();
  });

  it('does not subscribe when disabled', () => {
    const { client, subscribe } = makeClient();
    render(
      React.createElement(Harness, { client, enabled: false, onData: vi.fn() }),
    );
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('subscribes with the printed query + variables and forwards data', () => {
    const { client, subscribe } = makeClient();
    const onData = vi.fn();
    render(React.createElement(Harness, { client, onData }));

    expect(subscribe).toHaveBeenCalledTimes(1);
    const call = subscribe.mock.calls[0];
    if (!call) throw new Error('expected subscribe to have been called');
    const [payload, sink] = call;
    expect(payload.variables).toEqual({ planId: 'p1' });
    expect(payload.query).toContain('planOutputChunkAdded');

    sink.next({ data: { planOutputChunkAdded: { id: 'c1' } } });
    expect(onData).toHaveBeenCalledWith({ planOutputChunkAdded: { id: 'c1' } });
  });

  it('disposes the subscription on unmount', () => {
    const { client, dispose } = makeClient();
    const { unmount } = render(
      React.createElement(Harness, { client, onData: vi.fn() }),
    );
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
