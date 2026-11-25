/**
 * @description One-time setup: authorize the X app for @openthrottleai with OAuth 2.0
 * Authorization Code + PKCE, and store the refresh token in `~/.openthrottle/.env`.
 *
 * Put `X_CLIENT_ID` (and `X_CLIENT_SECRET` for a confidential client) in the env file or the
 * environment first, register `http://127.0.0.1:<port>/callback` as the app's callback URL, then
 * run `pnpm run social:x-auth` and approve in the browser while signed in as @openthrottleai.
 * Nothing here prints a token. Buying X API credits is a human step in the developer portal.
 *
 * Exit codes: 0 stored, 1 the flow failed, 2 configuration is missing.
 */
import { createServer } from 'node:http';

import {
  X_AUTH_TIMEOUT_MS,
  X_DEFAULT_REDIRECT_PORT,
  X_ENV_KEYS,
  X_REDIRECT_PATH,
} from '../config/x-api.ts';
import { completeXAuthorization } from '../utils/completeXAuthorization.ts';
import { redactSecrets } from '../utils/redactSecrets.ts';
import { getUserEnvPath, readEnvValues } from '../utils/user-env-file.ts';
import {
  buildAuthorizeUrl,
  createOAuthState,
  createPkcePair,
} from '../utils/x-oauth.ts';

const envPath = getUserEnvPath();
const fileEnv = await readEnvValues(envPath);
const fromFile = fileEnv.ok ? fileEnv.value : {};
const pick = (key: string): string | undefined => {
  const value = process.env[key] ?? fromFile[key];

  return value === undefined || value.trim() === '' ? undefined : value.trim();
};
const clientId = pick(X_ENV_KEYS.clientId);
const clientSecret = pick(X_ENV_KEYS.clientSecret);
const port = Number(pick(X_ENV_KEYS.redirectPort) ?? X_DEFAULT_REDIRECT_PORT);

if (clientId === undefined) {
  console.error(
    `x-auth: set ${X_ENV_KEYS.clientId} in ${envPath} or the environment (from the X developer portal), then run this again.`,
  );
  process.exit(2);
}

const redirectUri = `http://127.0.0.1:${port}${X_REDIRECT_PATH}`;
const pkce = createPkcePair();
const state = createOAuthState();
const authorizeUrl = buildAuthorizeUrl({
  challenge: pkce.challenge,
  clientId,
  redirectUri,
  state,
});

const outcome = await new Promise<number>((resolve) => {
  const timer = setTimeout(() => {
    console.error(
      `x-auth: no approval within ${X_AUTH_TIMEOUT_MS / 60_000} minutes; run it again.`,
    );
    server.close();
    resolve(1);
  }, X_AUTH_TIMEOUT_MS);

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', redirectUri);

    if (url.pathname !== X_REDIRECT_PATH) {
      response.writeHead(404).end();

      return;
    }

    void completeXAuthorization({
      callback: url.searchParams,
      client: { clientId, clientSecret },
      envPath,
      expectedState: state,
      fetch,
      now: Date.now,
      redirectUri,
      verifier: pkce.verifier,
    }).then((result) => {
      const message = result.ok
        ? `Stored ${X_ENV_KEYS.refreshToken} in ${envPath} (scope: ${result.value.scope}).`
        : `failed (${result.error.kind}): ${redactSecrets(result.error.message, [clientSecret])}`;

      response
        .writeHead(result.ok ? 200 : 400, {
          'Content-Type': 'text/plain; charset=utf-8',
        })
        .end(`${message}\nYou can close this tab.\n`);
      (result.ok ? console.log : console.error)(`x-auth: ${message}`);
      clearTimeout(timer);
      server.close();
      resolve(result.ok ? 0 : 1);
    });
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`x-auth: listening on ${redirectUri}`);
    console.log(
      `x-auth: open this URL signed in as @openthrottleai and approve:\n\n  ${authorizeUrl}\n`,
    );
  });
});

process.exit(outcome);
