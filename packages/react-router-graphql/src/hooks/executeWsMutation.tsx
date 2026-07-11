/**
 * @description Execute a mutation over an existing graphql-ws connection.
 * graphql-ws runs single-result operations through the same `subscribe`
 * primitive as subscriptions — the server sends one `next` then `complete`.
 * Use this when the mutation should ride the already-open realtime socket
 * (e.g. high-frequency audio chunk uploads) instead of a separate HTTP POST.
 */
import { print } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { GraphqlWsClient } from './createGraphqlWsClient';

/**
 * @description Run `document` (a mutation or query) over the graphql-ws client
 * and resolve with its data. Rejects on transport errors, GraphQL errors, or
 * completion without data.
 *
 * @public
 */
export async function executeWsMutation<
  TData,
  TVariables extends Record<string, unknown>,
>(
  client: GraphqlWsClient,
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
): Promise<TData> {
  return await new Promise<TData>((resolve, reject) => {
    let result: TData | undefined;

    client.subscribe<TData, TVariables>(
      { query: print(document), variables },
      {
        complete: () => {
          if (result === undefined) {
            reject(new Error('Operation completed without data'));

            return;
          }
          resolve(result);
        },
        error: (error) => {
          reject(
            error instanceof Error ? error : new Error(JSON.stringify(error)),
          );
        },
        next: (message) => {
          if (message.errors !== undefined && message.errors.length > 0) {
            reject(new Error(message.errors.map((e) => e.message).join('; ')));

            return;
          }
          if (message.data != null) {
            result = message.data;
          }
        },
      },
    );
  });
}
