import { X_ACCESS_TOKEN_SKEW_MS, X_ENV_KEYS } from '../config/x-api.ts';
import type { Result } from '../types/social-post.ts';
import { readEnvValues, upsertEnvValues } from './user-env-file.ts';
import type { FetchLike, XOAuthError, XTokenSet } from './x-oauth.ts';
import { requestXToken } from './x-oauth.ts';

/**
 * @description Why no access token could be had: the env file lacks a key, cannot be written, or
 * X refused the refresh.
 * @public
 */
export type XTokenClientError =
  | XOAuthError
  | { readonly kind: 'env-write'; readonly message: string }
  | { readonly kind: 'missing-config'; readonly message: string };

/** @description Hands out a valid user access token, refreshing and persisting as it goes. */
export interface XTokenClient {
  readonly getAccessToken: () => Promise<Result<string, XTokenClientError>>;
  /** @description Every secret the client has seen, for {@link redactSecrets}. */
  readonly secrets: () => readonly string[];
}

/** @description What {@link createXTokenClient} needs. */
export interface XTokenClientOptions {
  readonly envPath: string;
  readonly fetch: FetchLike;
  readonly now: () => number;
}

/**
 * @description A token client over the user env file. The first call refreshes: it reads
 * `X_CLIENT_ID`, `X_CLIENT_SECRET` (optional) and `X_REFRESH_TOKEN`, asks X for a new token pair,
 * and writes the rotated refresh token back atomically **before** returning the access token. X
 * invalidates the old refresh token the moment it issues a new one, so a write that fails is an
 * error rather than a warning: the caller must stop and say so, because the next run would be
 * locked out. Later calls reuse the access token until shortly before it expires.
 * @public
 */
export const createXTokenClient = (
  options: XTokenClientOptions,
): XTokenClient => {
  const { envPath, now } = options;
  const seen = new Set<string>();
  let current: XTokenSet | undefined;

  const remember = (...values: ReadonlyArray<string | undefined>): void => {
    values.forEach((value) => {
      if (value !== undefined && value !== '') {
        seen.add(value);
      }
    });
  };

  const refresh = async (): Promise<Result<XTokenSet, XTokenClientError>> => {
    const env = await readEnvValues(envPath);

    if (!env.ok) {
      return {
        error: { kind: 'missing-config', message: env.error },
        ok: false,
      };
    }

    const clientId = env.value[X_ENV_KEYS.clientId];
    const clientSecret = env.value[X_ENV_KEYS.clientSecret] || undefined;
    const refreshToken =
      current?.refreshToken ?? env.value[X_ENV_KEYS.refreshToken];

    remember(clientSecret, refreshToken);

    if (!clientId || !refreshToken) {
      return {
        error: {
          kind: 'missing-config',
          message: `${X_ENV_KEYS.clientId} and ${X_ENV_KEYS.refreshToken} must be set in ${envPath}: run the x-auth setup command`,
        },
        ok: false,
      };
    }

    const tokens = await requestXToken({
      client: { clientId, clientSecret },
      fetch: options.fetch,
      grant: { grant_type: 'refresh_token', refresh_token: refreshToken },
      now,
    });

    if (!tokens.ok) {
      return tokens;
    }

    remember(tokens.value.accessToken, tokens.value.refreshToken);

    const written = await upsertEnvValues(envPath, {
      [X_ENV_KEYS.refreshToken]: tokens.value.refreshToken,
    });

    if (!written.ok) {
      return {
        error: {
          kind: 'env-write',
          message: `X rotated the refresh token but ${envPath} could not be written (${written.error}); re-run the x-auth setup command`,
        },
        ok: false,
      };
    }

    return tokens;
  };

  return {
    getAccessToken: async () => {
      const isFresh =
        current !== undefined &&
        current.expiresAt - X_ACCESS_TOKEN_SKEW_MS > now();

      if (isFresh && current !== undefined) {
        return { ok: true, value: current.accessToken };
      }

      const tokens = await refresh();

      if (!tokens.ok) {
        return tokens;
      }

      current = tokens.value;

      return { ok: true, value: current.accessToken };
    },
    secrets: () => {
      return [...seen];
    },
  };
};
