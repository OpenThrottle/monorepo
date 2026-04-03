import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { GraphqlResponse } from '@openthrottle/nodejs-graphql';
import { print } from 'graphql';
import { parseDateTimeInResponse } from './parse-response.js';

/**
 * @description POST a typed document to an explicit GraphQL URL with merged headers (Authorization, custom headers). Mirrors `@openthrottle/nodejs-graphql` `executeGraphqlAtUrl` with additional header support.
 */
export async function postOpenthrottleGraphql<
  TData,
  TVariables extends Record<string, unknown>,
>(
  graphqlUrl: string,
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables | undefined,
  headers: Record<string, string>,
): Promise<TData> {
  const body = JSON.stringify({
    query: print(document),
    variables: variables ?? undefined,
  });

  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const res = await fetch(graphqlUrl, {
    body,
    headers: mergedHeaders,
    method: 'POST',
  });

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- wire JSON to GraphqlResponse (same as @openthrottle/nodejs-graphql)
  const json = (await res.json()) as GraphqlResponse<TData>;

  if (!res.ok) {
    const message = json.errors?.[0]?.message ?? res.statusText;
    throw new Error(
      `openthrottle-server GraphQL error ${res.status}: ${message}`,
    );
  }

  if (json.errors != null && json.errors.length > 0) {
    const first = json.errors[0];
    throw new Error(`GraphQL errors: ${first?.message ?? 'unknown'}`);
  }

  if (json.data == null) {
    throw new Error('GraphQL response missing data');
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- parseDateTime widens JSON; result matches TData
  return parseDateTimeInResponse(json.data) as TData;
}
