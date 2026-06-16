/**
 * @description Thin React hook over a graphql-ws client. Subscribes while mounted
 * (and `enabled`), forwarding each payload to `onData`; tears down on unmount or
 * when the variables/client change. No-op when the client is null (SSR) or
 * disabled, so it is safe to call unconditionally from a route component.
 *
 * Deliberately tiny — no Apollo Client. Pair it with the loader snapshot: seed
 * component state from the loader, then merge deltas from here (dedupe by id).
 */
import * as React from 'react';
import { print } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { GraphqlWsClient } from './createGraphqlWsClient';

/**
 * Callbacks for {@link useSubscription}.
 */
export interface UseSubscriptionHandlers<TData> {
  /** Called when the server completes the subscription. */
  readonly onComplete?: () => void;
  /** Called with each subscription payload's `data`. */
  readonly onData: (data: TData) => void;
  /** Called on transport/operation error. */
  readonly onError?: (error: unknown) => void;
}

/**
 * @description Subscribe to `document` with `variables` for the lifetime of the
 * component. Returns nothing — consume results via `handlers.onData`. Re-subscribes
 * when `client`, `enabled`, the document, or the (shallow-serialized) variables
 * change. Handlers may change between renders without forcing a re-subscribe.
 */
export function useSubscription<
  TData,
  TVariables extends Record<string, unknown>,
>(
  client: GraphqlWsClient | null,
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  handlers: UseSubscriptionHandlers<TData>,
  enabled = true,
): void {
  // Hooks
  const handlersRef = React.useRef(handlers);
  handlersRef.current = handlers;

  // Setup

  // Serialize variables so the effect re-runs on value (not identity) changes.
  const variablesKey = JSON.stringify(variables);

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(
    () => {
      // 🔌 Short Circuit
      if (!client || !enabled) return undefined;

      const dispose = client.subscribe<TData, TVariables>(
        { query: print(document), variables },
        {
          complete: () => handlersRef.current.onComplete?.(),
          error: (error) => handlersRef.current.onError?.(error),
          next: (message) => {
            if (message.data) handlersRef.current.onData(message.data);
          },
        },
      );

      return () => dispose();
    },

    // variablesKey stands in for `variables`; handlers are read via the ref.

    [client, document, enabled, variablesKey],
  );
}
