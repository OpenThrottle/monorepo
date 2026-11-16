import { describe, expect, it } from 'vitest';

import type { McpPublicAuthMode } from '../protected-resource.ts';
import {
  buildProtectedResourceMetadata,
  getProtectedResourceMetadataPaths,
  resolveMcpHttpAuthMode,
} from '../protected-resource.ts';

describe('resolveMcpHttpAuthMode', () => {
  it('is internal when OT_MCP_PUBLIC_URL is unset', () => {
    expect(resolveMcpHttpAuthMode({})).toEqual({
      mode: { kind: 'internal' },
      ok: true,
    });
  });

  it('canonicalizes the resource and issuer URLs', () => {
    expect(
      resolveMcpHttpAuthMode({
        OT_MCP_PUBLIC_URL: 'https://MCP.example.com/mcp/',
        OT_OAUTH_ISSUER: 'https://api.example.com/',
      }),
    ).toEqual({
      mode: {
        allowStaticToken: false,
        issuer: 'https://api.example.com',
        kind: 'public',
        resource: 'https://mcp.example.com/mcp',
      },
      ok: true,
    });
  });

  it('reads the deprecated static-token flag only when it is exactly true', () => {
    const resolved = resolveMcpHttpAuthMode({
      OT_MCP_ALLOW_STATIC_TOKEN: 'true',
      OT_MCP_PUBLIC_URL: 'https://mcp.example.com/mcp',
      OT_OAUTH_ISSUER: 'https://api.example.com',
    });

    expect(
      resolved.ok &&
        resolved.mode.kind === 'public' &&
        resolved.mode.allowStaticToken,
    ).toBe(true);
  });

  describe('when public mode is misconfigured', () => {
    it('requires an issuer', () => {
      const resolved = resolveMcpHttpAuthMode({
        OT_MCP_PUBLIC_URL: 'https://mcp.example.com/mcp',
      });

      expect(resolved.ok).toBe(false);
    });

    it('refuses plain http off loopback', () => {
      const resolved = resolveMcpHttpAuthMode({
        OT_MCP_PUBLIC_URL: 'http://mcp.example.com/mcp',
        OT_OAUTH_ISSUER: 'https://api.example.com',
      });

      expect(resolved.ok).toBe(false);
    });

    it('refuses a fragment', () => {
      const resolved = resolveMcpHttpAuthMode({
        OT_MCP_PUBLIC_URL: 'https://mcp.example.com/mcp#x',
        OT_OAUTH_ISSUER: 'https://api.example.com',
      });

      expect(resolved.ok).toBe(false);
    });

    it('accepts http on a loopback host for local development', () => {
      const resolved = resolveMcpHttpAuthMode({
        OT_MCP_PUBLIC_URL: 'http://localhost:6026/mcp',
        OT_OAUTH_ISSUER: 'http://localhost:6021',
      });

      expect(resolved.ok).toBe(true);
    });
  });
});

describe('protected resource metadata', () => {
  const mode: McpPublicAuthMode = {
    allowStaticToken: false,
    issuer: 'https://api.example.com',
    kind: 'public',
    resource: 'https://mcp.example.com/mcp',
  };

  it('serves the path-suffixed and bare well-known paths', () => {
    expect(getProtectedResourceMetadataPaths(mode)).toEqual([
      '/.well-known/oauth-protected-resource/mcp',
      '/.well-known/oauth-protected-resource',
    ]);
  });

  it('serves only the bare path for a root resource', () => {
    expect(
      getProtectedResourceMetadataPaths({
        ...mode,
        resource: 'https://mcp.example.com',
      }),
    ).toEqual(['/.well-known/oauth-protected-resource']);
  });

  it('names the authorization server and omits offline_access', () => {
    const metadata = buildProtectedResourceMetadata(mode, 'openthrottle');

    expect(metadata.authorization_servers).toEqual(['https://api.example.com']);
    expect(metadata.resource).toBe('https://mcp.example.com/mcp');
    expect(metadata.scopes_supported).not.toContain('offline_access');
  });
});
