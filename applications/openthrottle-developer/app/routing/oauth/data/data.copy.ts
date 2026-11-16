/**
 * @description Copy for the OAuth consent screen (`/oauth/consent`), single-sourced so the
 * components and their tests read the same strings.
 */
export const OAUTH_CONSENT_COPY = {
  allow: 'Allow access',
  allowing: 'Allowing…',
  deny: 'Deny',
  denying: 'Denying…',
  description: `An app wants to connect to OpenThrottle on your behalf. It can only do what your own account can do.`,
  duration: `Access lasts 30 days. You can revoke it at any time from Settings → Connections.`,
  identifiedAs: 'Identified as',
  readScopeDescription: `See your plans, tasks, notes, run history and search results.`,
  readScopeTitle: 'Read your OpenThrottle data',
  returnsTo: 'Returns to',
  title: 'Allow this app to use OpenThrottle?',
  unverifiedName: `OpenThrottle cannot verify an app's name. Check the address above before you allow it.`,
  writeScopeDescription: `Create and update plans, tasks and notes, and record runs. Turn this off to grant read-only access.`,
  writeScopeTitle: 'Make changes',
} as const;

export const OAUTH_CONSENT_UNAVAILABLE_COPY = {
  description: `This authorization link has expired or was already used. Start the connection again from your MCP client.`,
  settingsLink: 'Manage connected apps',
  title: 'This request is no longer valid',
} as const;

/** @description The scope strings the consent form submits. */
export const OAUTH_SCOPES = {
  read: 'mcp:read',
  write: 'mcp:write',
} as const;
