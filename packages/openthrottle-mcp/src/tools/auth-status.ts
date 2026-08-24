/**
 * @description Auth-status tool handler + schema (`auth_status`). A lightweight,
 * in-band signal that distinguishes "connected + authenticated" from "connected but
 * silently 401ing" (a stale long-lived stdio MCP). Runs one authenticated GraphQL
 * probe with the resolved token and reports a structured verdict + actionable
 * recovery guidance — it never throws on an auth failure (diagnosing IS its job).
 * Registered via the shared `developerMcpToolDefinitions` registry and the Nest surface.
 */

import { z } from 'zod';
import {
  executeGraphqlWithAuth,
  getGraphQLUrl,
} from '@openthrottle/nodejs-graphql';
import { ListSourcesDocument } from '../__generated__/graphql.js';
import type { GenericResult } from '../types/index.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';

type AuthStatusStructured = {
  authStatus: {
    authenticated: boolean;
    detail: string;
    server: string;
    tokenIdentity: string | null;
    tokenPresent: boolean;
  };
};

type AuthStatusResult = GenericResult<AuthStatusStructured>;

export const authStatusToolParameters = z.object({});

export const authStatusToolDescription = `Auth-status probe: distinguishes a healthy MCP ("connected + authenticated") from the silent-401 trap ("connected but every authenticated tool 401s") on the long-lived stdio server. Runs ONE authenticated GraphQL query with the resolved token and reports authenticated (true/false), the server it hit, a redacted token identity (never the secret), and — when unauthenticated — the exact reconnect steps. Call this FIRST when authenticated OT tools start failing but 'health' is OK.`;

/**
 * @description Redacts a bearer token to a non-secret identity for reporting.
 * Service-account tokens (`ot_sa_<prefix>_<secret>`) reduce to `ot_sa_<prefix>`
 * (the prefix is a public credential id, not the secret). Anything else is
 * reported only by shape so no secret material leaks.
 */
function redactTokenIdentity(token: string): string {
  if (token.startsWith('ot_sa_')) {
    const parts = token.split('_');
    if (parts.length >= 4) {
      return `${parts[0]}_${parts[1]}_${parts[2]}`;
    }
    return 'ot_sa_(malformed)';
  }
  return '(non-service-account token)';
}

const RECONNECT_STEPS = [
  '  1. Provision/verify the token:  pnpm run database:bootstrap-service-accounts',
  '  2. Set it in the root .env:     OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_<prefix>_<secret>',
  '     (a rotated .env token is picked up automatically within ~5s — no relaunch needed)',
  '  3. If it was REVOKED (not rotated): reconnect the MCP (/mcp reconnect) or restart the client;',
  '     last resort — run the stdio-fallback launcher: bash scripts/run-openthrottle-mcp.sh',
  '  Details: packages/openthrottle-mcp/docs/AUTH.md',
].join('\n');

/**
 * @description Classifies whether a thrown GraphQL error is an authentication
 * failure (token missing/revoked/wrong server/insufficient role) vs a transient
 * server/network error, so the report does not blame the token for a hiccup.
 */
function isAuthError(message: string): boolean {
  return /unauthori|unauthenticated|forbidden|\b401\b|\b403\b/i.test(message);
}

export async function authStatusToolHandler(
  _args: z.infer<typeof authStatusToolParameters>,
): Promise<AuthStatusResult> {
  let server = '(unknown)';
  try {
    server = getGraphQLUrl();
  } catch {
    // getGraphQLUrl throws when API_URL_INTERNAL is unset; keep the placeholder.
  }

  let token: string;
  try {
    token = getAuthToken();
  } catch {
    const detail = [
      'UNAUTHENTICATED: no auth token is set — every authenticated OT tool will 401.',
      'Fix:',
      RECONNECT_STEPS,
    ].join('\n');
    return {
      content: [{ text: detail, type: 'text' as const }],
      structuredContent: {
        authStatus: {
          authenticated: false,
          detail,
          server,
          tokenIdentity: null,
          tokenPresent: false,
        },
      },
    };
  }

  const tokenIdentity = redactTokenIdentity(token);

  try {
    await executeGraphqlWithAuth(token, ListSourcesDocument, {});
    const detail = `AUTHENTICATED: token ${tokenIdentity} accepted by ${server}.`;
    return {
      content: [{ text: detail, type: 'text' as const }],
      structuredContent: {
        authStatus: {
          authenticated: true,
          detail,
          server,
          tokenIdentity,
          tokenPresent: true,
        },
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (isAuthError(message)) {
      const detail = [
        `STALE / UNAUTHENTICATED: ${server} rejected token ${tokenIdentity} — revoked, wrong server, or missing plans:* role.`,
        'This is the silent-401 trap. Recover:',
        RECONNECT_STEPS,
      ].join('\n');
      return {
        content: [{ text: detail, type: 'text' as const }],
        structuredContent: {
          authStatus: {
            authenticated: false,
            detail,
            server,
            tokenIdentity,
            tokenPresent: true,
          },
        },
      };
    }

    // Transient/ambiguous (timeout, 5xx, network): a token is present but we could
    // not confirm it. Report inconclusive rather than blaming the token.
    const detail = `INCONCLUSIVE: token ${tokenIdentity} is set but the probe to ${server} did not complete (${message}). Retry; if it persists, check the server is up (health) before touching the token.`;
    return {
      content: [{ text: detail, type: 'text' as const }],
      structuredContent: {
        authStatus: {
          authenticated: false,
          detail,
          server,
          tokenIdentity,
          tokenPresent: true,
        },
      },
    };
  }
}
