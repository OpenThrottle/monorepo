import { describe, expect, it } from 'vitest';

import {
  buildAuthorizationRedirect,
  buildAuthorizationServerMetadata,
  canonicalizeOAuthUrl,
  describeClientHost,
  readOAuthParam,
  readOAuthStringArray,
  resolveOAuthServerConfig,
} from './oauth.utils.ts';

describe('canonicalizeOAuthUrl', () => {
  it('lowercases the host and drops a trailing slash', () => {
    expect(canonicalizeOAuthUrl('https://MCP.Example.com/mcp/')).toBe(
      'https://mcp.example.com/mcp',
    );
  });

  it('allows http only on loopback', () => {
    expect(canonicalizeOAuthUrl('http://localhost:7151')).toBe(
      'http://localhost:7151',
    );
    expect(canonicalizeOAuthUrl('http://api.example.com')).toBeNull();
  });

  it('rejects query, fragment and junk', () => {
    expect(canonicalizeOAuthUrl('https://a.example/mcp?x=1')).toBeNull();
    expect(canonicalizeOAuthUrl('https://a.example/mcp#x')).toBeNull();
    expect(canonicalizeOAuthUrl('nope')).toBeNull();
  });
});

describe('resolveOAuthServerConfig', () => {
  it('is disabled without OT_OAUTH_ISSUER', () => {
    expect(resolveOAuthServerConfig({})).toEqual({ kind: 'disabled' });
  });

  it('resolves issuer, resources and the default consent URL', () => {
    expect(
      resolveOAuthServerConfig({
        APP_URL_DEVELOPER: 'https://app.example.com/',
        OT_MCP_PUBLIC_URL: `https://mcp.example.com/mcp, https://mcp2.example.com`,
        OT_OAUTH_ISSUER: 'https://api.example.com/',
      }),
    ).toEqual({
      config: {
        consentUrl: 'https://app.example.com/oauth/consent',
        issuer: 'https://api.example.com',
        resources: ['https://mcp.example.com/mcp', 'https://mcp2.example.com'],
      },
      kind: 'enabled',
    });
  });

  describe('when misconfigured', () => {
    it('requires a resource', () => {
      expect(
        resolveOAuthServerConfig({
          APP_URL_DEVELOPER: 'https://app.example.com',
          OT_OAUTH_ISSUER: 'https://api.example.com',
        }).kind,
      ).toBe('invalid');
    });

    it('requires a usable consent URL', () => {
      expect(
        resolveOAuthServerConfig({
          OT_MCP_PUBLIC_URL: 'https://mcp.example.com/mcp',
          OT_OAUTH_ISSUER: 'https://api.example.com',
        }).kind,
      ).toBe('invalid');
    });

    it('rejects a plain-http issuer', () => {
      expect(
        resolveOAuthServerConfig({
          APP_URL_DEVELOPER: 'https://app.example.com',
          OT_MCP_PUBLIC_URL: 'https://mcp.example.com/mcp',
          OT_OAUTH_ISSUER: 'http://api.example.com',
        }).kind,
      ).toBe('invalid');
    });
  });
});

describe('buildAuthorizationServerMetadata', () => {
  it('advertises S256-only public-client code flow with iss support', () => {
    const metadata = buildAuthorizationServerMetadata({
      consentUrl: 'https://app.example.com/oauth/consent',
      issuer: 'https://api.example.com',
      resources: ['https://mcp.example.com/mcp'],
    });

    expect(metadata).toMatchObject({
      authorization_endpoint: 'https://api.example.com/oauth/authorize',
      authorization_response_iss_parameter_supported: true,
      code_challenge_methods_supported: ['S256'],
      issuer: 'https://api.example.com',
      response_types_supported: ['code'],
      token_endpoint_auth_methods_supported: ['none'],
    });
  });
});

describe('readOAuthParam', () => {
  it('reads a trimmed string and treats blanks, arrays and non-objects as absent', () => {
    expect(readOAuthParam({ a: ' x ' }, 'a')).toBe('x');
    expect(readOAuthParam({ a: '  ' }, 'a')).toBeNull();
    expect(readOAuthParam({ a: ['x', 'y'] }, 'a')).toBeNull();
    expect(readOAuthParam(null, 'a')).toBeNull();
  });
});

describe('readOAuthStringArray', () => {
  it('reads an all-string array only', () => {
    expect(readOAuthStringArray({ a: ['x'] }, 'a')).toEqual(['x']);
    expect(readOAuthStringArray({ a: ['x', 1] }, 'a')).toBeNull();
    expect(readOAuthStringArray({ a: 'x' }, 'a')).toBeNull();
  });
});

describe('buildAuthorizationRedirect', () => {
  it('appends parameters, omitting nulls and keeping existing query', () => {
    const url = new URL(
      buildAuthorizationRedirect('http://127.0.0.1:5000/cb?keep=1', {
        code: 'c',
        iss: 'https://api.example.com',
        state: null,
      }),
    );

    expect(url.searchParams.get('keep')).toBe('1');
    expect(url.searchParams.get('code')).toBe('c');
    expect(url.searchParams.has('state')).toBe(false);
  });
});

describe('describeClientHost', () => {
  it('prefers a CIMD URL client_id', () => {
    expect(
      describeClientHost({
        clientId: 'https://claude.ai/oauth/claude-code-client-metadata',
        clientUri: null,
        redirectUris: [],
      }),
    ).toBe('claude.ai');
  });

  it('falls back to client_uri, then the redirect URI host or scheme', () => {
    expect(
      describeClientHost({
        clientId: 'ot_client_x',
        clientUri: 'https://cursor.com',
        redirectUris: [],
      }),
    ).toBe('cursor.com');
    expect(
      describeClientHost({
        clientId: 'ot_client_x',
        clientUri: null,
        redirectUris: ['cursor://anysphere.cursor-mcp/oauth/callback'],
      }),
    ).toBe('cursor://');
  });
});
