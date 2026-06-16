/**
 * @description GraphQL client our react-router applications. Used in route
 * loaders/actions with typed documents create using GraphQL Codegens.
 * Requires "API_URL" in env (e.g. http://localhost:6021).
 */
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import {
  executeGraphql,
  executeGraphqlWithAuth as executeGraphqlWithAuthNodeJS,
} from '@openthrottle/nodejs-graphql';
import { getAuthTokenFromCookie } from '@openthrottle/react-router-auth';

/**
 * @description Runs executeGraphql with Authorization: Bearer <token> when
 * the request has an auth cookie. Use in loaders/actions that have access to the request.
 */
export async function executeGraphqlWithAuth<
  TData,
  TVariables extends Record<string, unknown>,
>(
  request: Request,
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
): Promise<TData> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = getAuthTokenFromCookie(cookieHeader);

  if (!token) {
    try {
      return await executeGraphql(document, variables);
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);
      const isAuthError = message === 'Unauthorized';

      if (isAuthError) {
        console.error(`💥 ${isAuthError} - no token 💥`, message);
      }

      throw error;
    }
  }

  try {
    return await executeGraphqlWithAuthNodeJS(token, document, variables);
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);
    const isAuthError = message === 'Unauthorized';

    if (isAuthError) {
      console.error(`💥 ${isAuthError} - with token 💥`, message);
    }

    throw error;
  }
}

export { executeGraphql };

export * from './hooks/createGraphqlWsClient';
export * from './hooks/useSubscription';
