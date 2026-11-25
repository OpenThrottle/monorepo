import { createHash, randomBytes } from 'node:crypto';

import { toErrorMessage } from '@openthrottle/nodejs-utils';

import {
  X_AUTHORIZE_URL,
  X_OAUTH_SCOPES,
  X_TOKEN_URL,
} from '../config/x-api.ts';
import type { Result } from '../types/social-post.ts';
import { redactSecrets } from './redactSecrets.ts';

/** @description The `fetch` the X clients call; injected so tests never touch the network. */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** @description The app's OAuth 2.0 client: a public client has no secret. */
export interface XOAuthClient {
  readonly clientId: string;
  readonly clientSecret: string | undefined;
}

/** @description What X returns from its token endpoint. */
export interface XTokenSet {
  readonly accessToken: string;
  /** @description Epoch milliseconds. */
  readonly expiresAt: number;
  readonly refreshToken: string;
  readonly scope: string;
}

/**
 * @description Why a token request failed. `auth` means X refused the credentials (a revoked app,
 * or a refresh token already rotated away): only re-running the setup command fixes it.
 * @public
 */
export type XOAuthError =
  | { readonly kind: 'auth'; readonly message: string; readonly status: number }
  | { readonly kind: 'http'; readonly message: string; readonly status: number }
  | { readonly kind: 'invalid-response'; readonly message: string }
  | { readonly kind: 'network'; readonly message: string };

/** @description A PKCE verifier and the S256 challenge derived from it. */
export interface PkcePair {
  readonly challenge: string;
  readonly verifier: string;
}

/** @description A fresh PKCE pair: a 64-byte random verifier and its SHA-256 challenge. */
export const createPkcePair = (): PkcePair => {
  const verifier = randomBytes(64).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  return { challenge, verifier };
};

/** @description A random `state` value that ties X's redirect to this setup run. */
export const createOAuthState = (): string => {
  return randomBytes(24).toString('base64url');
};

/** @description The URL the human opens to approve the app for @openthrottleai. */
export const buildAuthorizeUrl = (params: {
  readonly challenge: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly state: string;
}): string => {
  const url = new URL(X_AUTHORIZE_URL);

  url.search = new URLSearchParams({
    client_id: params.clientId,
    code_challenge: params.challenge,
    code_challenge_method: 'S256',
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: X_OAUTH_SCOPES.join(' '),
    state: params.state,
  }).toString();

  return url.toString();
};

const readTokenSet = (
  body: unknown,
  now: number,
): Result<XTokenSet, XOAuthError> => {
  const isObject = typeof body === 'object' && body !== null;
  const accessToken =
    isObject && 'access_token' in body ? body.access_token : undefined;
  const refreshToken =
    isObject && 'refresh_token' in body ? body.refresh_token : undefined;
  const expiresIn =
    isObject && 'expires_in' in body ? body.expires_in : undefined;
  const scope = isObject && 'scope' in body ? body.scope : '';

  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
    return {
      error: {
        kind: 'invalid-response',
        message: `X's token response had no access_token or refresh_token (was offline.access granted?)`,
      },
      ok: false,
    };
  }

  const seconds = typeof expiresIn === 'number' ? expiresIn : 0;

  return {
    ok: true,
    value: {
      accessToken,
      expiresAt: now + seconds * 1000,
      refreshToken,
      scope: typeof scope === 'string' ? scope : '',
    },
  };
};

/**
 * @description POST to X's token endpoint and read the token set. A confidential client
 * authenticates with HTTP Basic; a public one sends only its `client_id`. Every message that can
 * leave this function has the client secret and the submitted grant values redacted.
 */
export const requestXToken = async (params: {
  readonly client: XOAuthClient;
  readonly fetch: FetchLike;
  readonly grant: Readonly<Record<string, string>>;
  readonly now: () => number;
}): Promise<Result<XTokenSet, XOAuthError>> => {
  const { client, grant } = params;
  const secrets = [client.clientSecret, ...Object.values(grant)];
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (client.clientSecret !== undefined) {
    const basic = Buffer.from(
      `${client.clientId}:${client.clientSecret}`,
    ).toString('base64');

    headers['Authorization'] = `Basic ${basic}`;
  }

  let response: Response;

  try {
    response = await params.fetch(X_TOKEN_URL, {
      body: new URLSearchParams({
        ...grant,
        client_id: client.clientId,
      }).toString(),
      headers,
      method: 'POST',
    });
  } catch (error) {
    return {
      error: {
        kind: 'network',
        message: redactSecrets(toErrorMessage(error), secrets),
      },
      ok: false,
    };
  }

  const text = await response.text();

  if (!response.ok) {
    const message = redactSecrets(text.slice(0, 500), secrets);
    const isAuth = response.status === 400 || response.status === 401;

    return {
      error: {
        kind: isAuth ? 'auth' : 'http',
        message,
        status: response.status,
      },
      ok: false,
    };
  }

  let body: unknown;

  try {
    body = JSON.parse(text);
  } catch {
    return {
      error: {
        kind: 'invalid-response',
        message: `X's token response was not JSON`,
      },
      ok: false,
    };
  }

  return readTokenSet(body, params.now());
};
