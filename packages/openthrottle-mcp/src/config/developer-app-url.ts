/**
 * @description Where the developer app lives, so a tool result can link a human to the page they act on. The MCP only ever talks to the GraphQL API, so it cannot discover this; it is read from the environment.
 *
 * Resolution order: `OPENTHROTTLE_DEVELOPER_URL` (the explicit MCP override, same key `.bootstrap-secrets.local` records), then `APP_URL_DEVELOPER` (already set wherever the MCP runs inside the server / compose stack), then the local default.
 */

/**
 * @description The developer app's local dev origin — the same value as `OPENTHROTTLE_DEVELOPER_APP_URL_DEVELOPER` in the root `.env.default`.
 * @public
 */
export const DEFAULT_DEVELOPER_APP_URL = 'http://localhost:6020';

const readUrl = (name: string): string | null => {
  const raw = process.env[name]?.trim() ?? '';
  return raw === '' ? null : raw.replace(/\/+$/, '');
};

/**
 * @description The developer app origin with no trailing slash.
 * @public
 */
export const getDeveloperAppBaseUrl = (): string =>
  readUrl('OPENTHROTTLE_DEVELOPER_URL') ??
  readUrl('APP_URL_DEVELOPER') ??
  DEFAULT_DEVELOPER_APP_URL;

/**
 * @description The developer-app blog editor URL for a post: `<developer base URL>/blog/<postId>`.
 * @public
 */
export const getBlogPostEditorUrl = (postId: string): string =>
  `${getDeveloperAppBaseUrl()}/blog/${encodeURIComponent(postId)}`;
