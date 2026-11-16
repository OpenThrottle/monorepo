/**
 * @description Serves the RFC 9728 Protected Resource Metadata document in public
 * mode, so an MCP client that got a 401 can discover OT's authorization server.
 * Anonymous by design, and CORS-open so browser-hosted clients can read it.
 */
import type {
  McpHttpAuthRequest,
  McpHttpAuthResponse,
} from './mcp-http-auth.middleware.ts';
import type { McpPublicAuthMode } from './protected-resource.ts';
import {
  buildProtectedResourceMetadata,
  getProtectedResourceMetadataPaths,
} from './protected-resource.ts';

type NextFn = () => void;

/**
 * @description The request with its HTTP method, which only this middleware reads.
 * @public
 */
export interface ProtectedResourceMetadataRequest extends McpHttpAuthRequest {
  readonly method?: string | undefined;
}

/**
 * @description Answers `GET`/`OPTIONS` on the metadata paths; everything else passes through.
 * @public
 */
export function protectedResourceMetadataMiddleware(
  mode: McpPublicAuthMode,
  resourceName: string,
): (
  req: ProtectedResourceMetadataRequest,
  res: McpHttpAuthResponse,
  next: NextFn,
) => void {
  const paths = new Set(getProtectedResourceMetadataPaths(mode));
  const body = JSON.stringify(
    buildProtectedResourceMetadata(mode, resourceName),
  );

  return (req, res, next): void => {
    const path = (req.url ?? '').split('?')[0] ?? '';

    if (!paths.has(path)) {
      next();
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD, OPTIONS');
      res.end();
      return;
    }

    res.statusCode = 200;
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', 'application/json');
    res.end(req.method === 'HEAD' ? undefined : body);
  };
}
