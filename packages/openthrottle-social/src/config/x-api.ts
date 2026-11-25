/** @description Where X sends the human to approve the app. */
export const X_AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize';

/** @description X's OAuth 2.0 token endpoint: code exchange and refresh. */
export const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token';

/** @description The X API v2 base URL. */
export const X_API_BASE_URL = 'https://api.x.com/2';

/**
 * @description The scopes the posting jobs need. `offline.access` is what makes X issue a refresh
 * token at all; without it the setup has to be re-run every two hours.
 */
export const X_OAUTH_SCOPES: readonly string[] = [
  'offline.access',
  'tweet.read',
  'tweet.write',
  'users.read',
];

/** @description The loopback port the setup command listens on for X's redirect. */
export const X_DEFAULT_REDIRECT_PORT = 8765;

/** @description The redirect path; the app's callback URL in the X developer portal must match. */
export const X_REDIRECT_PATH = '/callback';

/** @description How long the setup command waits for the human to approve, in milliseconds. */
export const X_AUTH_TIMEOUT_MS = 5 * 60 * 1000;

/** @description Refresh an access token this long before X says it expires, in milliseconds. */
export const X_ACCESS_TOKEN_SKEW_MS = 60 * 1000;

/** @description The `~/.openthrottle/.env` keys this package reads and writes. */
export const X_ENV_KEYS = {
  clientId: 'X_CLIENT_ID',
  clientSecret: 'X_CLIENT_SECRET',
  redirectPort: 'X_REDIRECT_PORT',
  refreshToken: 'X_REFRESH_TOKEN',
} as const;

export type XEnvKeysKey = keyof typeof X_ENV_KEYS;
export type XEnvKeysValue = (typeof X_ENV_KEYS)[XEnvKeysKey];

/** @description The comment line written above each line this package added to the env file. */
export const SOCIAL_ENV_MANAGED_MARKER = '# managed by openthrottle-social';
