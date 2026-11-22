/**
 * @description Nest guard on the streamable-HTTP MCP controller (passed through
 * `McpModule.forRoot({ guards })`, so it runs after body parsing). In public mode, a
 * `tools/call` of a write tool with an OAuth token that lacks `mcp:write` is answered
 * HTTP 403 with `WWW-Authenticate: Bearer error="insufficient_scope", scope="mcp:write",
 * resource_metadata=…` — the MCP spec's step-up signal — instead of reaching the tool and
 * surfacing a GraphQL error string. Everything else passes; the API remains the real guard.
 */
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';

import { ViewerOAuthScopesDocument } from '../__generated__/graphql.js';
import { isReadOnlyTool } from '../config/tool-access.ts';
import type { OAuthScopeLookup } from './createOAuthScopeLookup.ts';
import { createOAuthScopeLookup } from './createOAuthScopeLookup.ts';
import { extractBearerToken } from './mcp-http-auth.middleware.ts';
import type {
  McpHttpAuthMode,
  McpPublicAuthMode,
} from './protected-resource.ts';
import {
  getProtectedResourceMetadataUrl,
  resolveMcpHttpAuthMode,
} from './protected-resource.ts';

const OAUTH_ACCESS_TOKEN_PREFIX = 'ot_oat_';
const WRITE_SCOPE = 'mcp:write';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * @description Names of the tools a JSON-RPC body calls (a single message or a batch).
 * @public
 */
export const readCalledToolNames = (body: unknown): readonly string[] => {
  const messages = Array.isArray(body) ? body : [body];
  const names: string[] = [];
  for (const message of messages) {
    if (!isRecord(message) || message.method !== 'tools/call') {
      continue;
    }
    const name = isRecord(message.params) ? message.params.name : undefined;
    // A call with no readable name is treated as a write (fail closed).
    names.push(typeof name === 'string' ? name : '');
  }
  return names;
};

/**
 * @description The insufficient_scope challenge (MCP authorization § Scope Challenge Handling).
 * @public
 */
export const buildInsufficientScopeChallenge = (
  mode: McpPublicAuthMode,
): string => {
  const metadataUrl = getProtectedResourceMetadataUrl(mode);
  return `Bearer error="insufficient_scope", scope="${WRITE_SCOPE}", resource_metadata="${metadataUrl}", error_description="This tool writes; the token needs the mcp:write scope."`;
};

/**
 * @description The guard's decision, separated from Nest so it can be tested directly.
 * @public
 */
export type WriteScopeDecision =
  | { readonly kind: 'allow' }
  | {
      readonly challenge: string;
      readonly kind: 'deny';
      readonly message: string;
    };

/**
 * @description Inputs to {@link evaluateWriteScope}.
 * @public
 */
export interface EvaluateWriteScopeInput {
  readonly authorization: string | undefined;
  readonly body: unknown;
  readonly lookup: OAuthScopeLookup;
  readonly mode: McpHttpAuthMode;
}

/**
 * @description Allow unless: public mode, the body calls a write tool, the bearer is an
 * OAuth access token, and the API reports its scopes without `mcp:write`.
 * @public
 */
export const evaluateWriteScope = async (
  input: EvaluateWriteScopeInput,
): Promise<WriteScopeDecision> => {
  if (input.mode.kind !== 'public') {
    return { kind: 'allow' };
  }

  const writes = readCalledToolNames(input.body).filter(
    (name) => !isReadOnlyTool(name),
  );
  if (writes.length === 0) {
    return { kind: 'allow' };
  }

  const token = extractBearerToken(input.authorization);
  if (!token.startsWith(OAUTH_ACCESS_TOKEN_PREFIX)) {
    return { kind: 'allow' };
  }

  const scopes = await input.lookup(token);
  if (scopes === null || scopes.includes(WRITE_SCOPE)) {
    return { kind: 'allow' };
  }

  return {
    challenge: buildInsufficientScopeChallenge(input.mode),
    kind: 'deny',
    message: `insufficient_scope: ${writes.join(', ')} needs the mcp:write scope.`,
  };
};

const defaultLookup: OAuthScopeLookup = createOAuthScopeLookup({
  fetchScopes: async (token) => {
    const data = await executeGraphqlWithAuth(
      token,
      ViewerOAuthScopesDocument,
      {},
    );
    return data.viewerOAuthScopes ?? null;
  },
  maxEntries: 1000,
  now: () => Date.now(),
  ttlMs: 30_000,
});

const readAuthorization = (
  req: Record<string, unknown>,
): string | undefined => {
  const headers = isRecord(req.headers) ? req.headers : {};
  const raw = headers.authorization;
  return typeof raw === 'string' ? raw : undefined;
};

@Injectable()
export class McpWriteScopeGuard implements CanActivate {
  private readonly resolved = resolveMcpHttpAuthMode(process.env);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.resolved.ok) {
      return true;
    }

    const http = context.switchToHttp();
    const req: unknown = http.getRequest();
    if (!isRecord(req)) {
      return true;
    }

    const decision = await evaluateWriteScope({
      authorization: readAuthorization(req),
      body: req.body,
      lookup: defaultLookup,
      mode: this.resolved.mode,
    });
    if (decision.kind === 'allow') {
      return true;
    }

    const res: unknown = http.getResponse();
    if (isRecord(res) && typeof res.setHeader === 'function') {
      res.setHeader('WWW-Authenticate', decision.challenge);
    }
    throw new ForbiddenException(decision.message);
  }
}
