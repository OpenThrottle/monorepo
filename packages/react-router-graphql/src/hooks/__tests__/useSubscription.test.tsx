import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { parse } from 'graphql';
import { render } from '@testing-library/react';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GraphqlWsClient } from '../createGraphqlWsClient';
import { useSubscription } from '../useSubscription';

// A minimal typed subscription document (the `query` string is what graphql-ws sees).
const DOCUMENT = parse(
  'subscription P($planId: ID!){ planOutputChunkAdded(planId: $planId){ id } }',
) as unknown as TypedDocumentNode<
  { planOutputChunkAdded: { id: string } },
  { planId: string }
>;

interface SubscribeArgs {
  complete: () => void;
  error: (e: unknown) => void;
  next: (msg: { data?: { planOutputChunkAdded: { id: string } } }) => void;
}

function makeClient(): {
  client: GraphqlWsClient;
  dispose: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
} {
  const dispose = vi.fn();
  const subscribe = vi.fn(() => dispose);
  const client = { subscribe } as unknown as GraphqlWsClient;
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
    const payload = subscribe.mock.calls[0]?.[0] as {
      query: string;
      variables: { planId: string };
    };
    expect(payload.variables).toEqual({ planId: 'p1' });
    expect(payload.query).toContain('planOutputChunkAdded');

    const sink = subscribe.mock.calls[0]?.[1] as SubscribeArgs;
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
