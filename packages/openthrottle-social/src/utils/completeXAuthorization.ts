import { X_ENV_KEYS } from '../config/x-api.ts';
import type { Result } from '../types/social-post.ts';
import { upsertEnvValues } from './user-env-file.ts';
import type { FetchLike, XOAuthClient, XOAuthError } from './x-oauth.ts';
import { requestXToken } from './x-oauth.ts';

/**
 * @description Why the setup could not finish.
 * @public
 */
export type XAuthorizationError =
  | XOAuthError
  | { readonly kind: 'denied'; readonly message: string }
  | { readonly kind: 'env-write'; readonly message: string }
  | { readonly kind: 'state-mismatch'; readonly message: string };

/** @description The query X redirected back with, plus what this setup run expects. */
export interface CompleteXAuthorizationParams {
  readonly callback: URLSearchParams;
  readonly client: XOAuthClient;
  readonly envPath: string;
  readonly expectedState: string;
  readonly fetch: FetchLike;
  readonly now: () => number;
  readonly redirectUri: string;
  readonly verifier: string;
}

/**
 * @description Finish the PKCE flow: check the redirect's `state`, exchange the code, and store
 * the client id, the client secret (a confidential client only) and the refresh token in the user
 * env file. Returns the granted scope, never a token.
 * @public
 */
export const completeXAuthorization = async (
  params: CompleteXAuthorizationParams,
): Promise<Result<{ readonly scope: string }, XAuthorizationError>> => {
  const { callback, client } = params;
  const denied = callback.get('error');

  if (denied !== null) {
    return {
      error: {
        kind: 'denied',
        message: `X returned ${denied}: the app was not approved`,
      },
      ok: false,
    };
  }

  const code = callback.get('code');

  if (callback.get('state') !== params.expectedState || code === null) {
    return {
      error: {
        kind: 'state-mismatch',
        message: 'The redirect did not match this setup run; start it again',
      },
      ok: false,
    };
  }

  const tokens = await requestXToken({
    client,
    fetch: params.fetch,
    grant: {
      code,
      code_verifier: params.verifier,
      grant_type: 'authorization_code',
      redirect_uri: params.redirectUri,
    },
    now: params.now,
  });

  if (!tokens.ok) {
    return tokens;
  }

  const written = await upsertEnvValues(params.envPath, {
    [X_ENV_KEYS.clientId]: client.clientId,
    [X_ENV_KEYS.refreshToken]: tokens.value.refreshToken,
    ...(client.clientSecret === undefined
      ? {}
      : { [X_ENV_KEYS.clientSecret]: client.clientSecret }),
  });

  if (!written.ok) {
    return {
      error: {
        kind: 'env-write',
        message: `${params.envPath}: ${written.error}`,
      },
      ok: false,
    };
  }

  return { ok: true, value: { scope: tokens.value.scope } };
};
