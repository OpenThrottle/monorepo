import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { parse } from 'graphql';
import { type Mock, describe, expect, it, vi } from 'vitest';
import type { GraphqlWsClient } from '../createGraphqlWsClient';
import { executeWsMutation } from '../executeWsMutation';

/**
 * Present a structural test double as its real type. The public API only
 * needs `subscribe`, so the mock boundary needs no `as` cast (mirrors the
 * pattern in useSubscription.test.tsx).
 */
function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

// A minimal typed mutation document (the `query` string is what graphql-ws sees).
const DOCUMENT: TypedDocumentNode<
  { updatePlan: { id: string } },
  { planId: string }
> = parse('mutation U($planId: ID!){ updatePlan(planId: $planId){ id } }');

interface SubscribeArgs {
  complete: () => void;
  error: (e: unknown) => void;
  next: (msg: {
    data?: { updatePlan: { id: string } };
    errors?: readonly { message: string }[];
  }) => void;
}

type SubscribePayload = {
  query: string;
  variables: { planId: string };
};

function makeClient(): {
  client: GraphqlWsClient;
  subscribe: Mock<
    (payload: SubscribePayload, sink: SubscribeArgs) => () => void
  >;
} {
  const subscribe =
    vi.fn<(payload: SubscribePayload, sink: SubscribeArgs) => () => void>();
  const client = asMock<GraphqlWsClient>({ subscribe });
  return { client, subscribe };
}

describe('executeWsMutation', () => {
  it('passes the printed query and variables through to subscribe', () => {
    const { client, subscribe } = makeClient();

    void executeWsMutation(client, DOCUMENT, { planId: 'p1' });

    expect(subscribe).toHaveBeenCalledTimes(1);
    const call = subscribe.mock.calls[0];
    if (!call) throw new Error('expected subscribe to have been called');
    const [payload] = call;
    expect(payload.variables).toEqual({ planId: 'p1' });
    expect(payload.query).toContain('updatePlan');
  });

  it('resolves with data on a successful next + complete', async () => {
    const { client, subscribe } = makeClient();

    const promise = executeWsMutation(client, DOCUMENT, { planId: 'p1' });

    const call = subscribe.mock.calls[0];
    if (!call) throw new Error('expected subscribe to have been called');
    const [, sink] = call;
    sink.next({ data: { updatePlan: { id: 'p1' } } });
    sink.complete();

    await expect(promise).resolves.toEqual({ updatePlan: { id: 'p1' } });
  });

  it('rejects when the transport reports an error', async () => {
    const { client, subscribe } = makeClient();

    const promise = executeWsMutation(client, DOCUMENT, { planId: 'p1' });

    const call = subscribe.mock.calls[0];
    if (!call) throw new Error('expected subscribe to have been called');
    const [, sink] = call;
    sink.error(new Error('socket closed'));

    await expect(promise).rejects.toThrow('socket closed');
  });

  it('wraps a non-Error transport error value', async () => {
    const { client, subscribe } = makeClient();

    const promise = executeWsMutation(client, DOCUMENT, { planId: 'p1' });

    const call = subscribe.mock.calls[0];
    if (!call) throw new Error('expected subscribe to have been called');
    const [, sink] = call;
    sink.error({ reason: 'boom' });

    await expect(promise).rejects.toThrow(JSON.stringify({ reason: 'boom' }));
  });

  it('rejects when the next message carries GraphQL errors', async () => {
    const { client, subscribe } = makeClient();

    const promise = executeWsMutation(client, DOCUMENT, { planId: 'p1' });

    const call = subscribe.mock.calls[0];
    if (!call) throw new Error('expected subscribe to have been called');
    const [, sink] = call;
    sink.next({ errors: [{ message: 'not authorized' }] });

    await expect(promise).rejects.toThrow('not authorized');
  });

  it('rejects when the operation completes without any data', async () => {
    const { client, subscribe } = makeClient();

    const promise = executeWsMutation(client, DOCUMENT, { planId: 'p1' });

    const call = subscribe.mock.calls[0];
    if (!call) throw new Error('expected subscribe to have been called');
    const [, sink] = call;
    sink.complete();

    await expect(promise).rejects.toThrow('Operation completed without data');
  });
});
