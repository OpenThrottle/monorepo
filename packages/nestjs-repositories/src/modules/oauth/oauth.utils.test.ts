import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  hashOAuthSecret,
  isOAuthAccessTokenAuthorization,
  isRegistrableRedirectUri,
  mintAuthorizationCode,
  mintOAuthToken,
  oauthHashesEqual,
  parseOAuthScopes,
  parseOAuthToken,
  redirectUriMatches,
  scopesAllowWrite,
  verifyPkceS256,
} from './oauth.utils.ts';

const challengeFor = (verifier: string): string => {
  return createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

describe('mintOAuthToken / parseOAuthToken', () => {
  it('round-trips an access token and stores only the hash', () => {
    const minted = mintOAuthToken('access');
    const parsed = parseOAuthToken(minted.token);

    expect(minted.token.startsWith('ot_oat_')).toBe(true);
    expect(parsed?.kind).toBe('access');
    expect(parsed?.prefix).toBe(minted.prefix);
    expect(minted.token).not.toContain(minted.secretHash);
    expect(hashOAuthSecret(parsed?.secret ?? '')).toBe(minted.secretHash);
  });

  it('round-trips a refresh token', () => {
    const minted = mintOAuthToken('refresh');

    expect(minted.token.startsWith('ot_ort_')).toBe(true);
    expect(parseOAuthToken(minted.token)?.kind).toBe('refresh');
  });

  it('mints distinct tokens', () => {
    expect(mintOAuthToken('access').token).not.toBe(
      mintOAuthToken('access').token,
    );
  });

  it('rejects foreign and malformed tokens', () => {
    expect(parseOAuthToken('ot_sa_abc_def')).toBeNull();
    expect(parseOAuthToken('ot_oat_nosecret')).toBeNull();
    expect(parseOAuthToken('ot_oat__secret')).toBeNull();
    expect(parseOAuthToken('ot_oat_ABC_def')).toBeNull();
  });
});

describe('isOAuthAccessTokenAuthorization', () => {
  it('detects a bearer access token', () => {
    expect(isOAuthAccessTokenAuthorization('Bearer ot_oat_a_b')).toBe(true);
    expect(isOAuthAccessTokenAuthorization('ot_oat_a_b')).toBe(true);
  });

  it('ignores refresh tokens and other schemes', () => {
    expect(isOAuthAccessTokenAuthorization('Bearer ot_ort_a_b')).toBe(false);
    expect(isOAuthAccessTokenAuthorization('Bearer ot_sa_a_b')).toBe(false);
  });
});

describe('mintAuthorizationCode', () => {
  it('returns the hash of the code', () => {
    const { code, codeHash } = mintAuthorizationCode();

    expect(hashOAuthSecret(code)).toBe(codeHash);
  });
});

describe('oauthHashesEqual', () => {
  it('compares equal and unequal values', () => {
    expect(oauthHashesEqual('abc', 'abc')).toBe(true);
    expect(oauthHashesEqual('abc', 'abd')).toBe(false);
    expect(oauthHashesEqual('abc', 'abcd')).toBe(false);
  });
});

describe('verifyPkceS256', () => {
  const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

  it('accepts the RFC 7636 appendix B example', () => {
    expect(
      verifyPkceS256(verifier, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'),
    ).toBe(true);
  });

  it('accepts a matching challenge', () => {
    const other = 'a'.repeat(43);

    expect(verifyPkceS256(other, challengeFor(other))).toBe(true);
  });

  it('rejects a wrong verifier', () => {
    expect(verifyPkceS256('b'.repeat(43), challengeFor('a'.repeat(43)))).toBe(
      false,
    );
  });

  it('rejects a verifier outside the RFC 7636 length and alphabet', () => {
    expect(verifyPkceS256('short', challengeFor('short'))).toBe(false);
    expect(
      verifyPkceS256(`${'a'.repeat(42)}!`, challengeFor(`${'a'.repeat(42)}!`)),
    ).toBe(false);
  });
});

describe('parseOAuthScopes', () => {
  it('defaults to every scope', () => {
    expect(parseOAuthScopes(undefined)).toEqual(['mcp:read', 'mcp:write']);
    expect(parseOAuthScopes('')).toEqual(['mcp:read', 'mcp:write']);
  });

  it('keeps a read-only request read-only', () => {
    expect(parseOAuthScopes('mcp:read')).toEqual(['mcp:read']);
  });

  it('adds mcp:read under mcp:write', () => {
    expect(parseOAuthScopes('mcp:write')).toEqual(['mcp:read', 'mcp:write']);
  });

  it('drops unknown scopes, including offline_access', () => {
    expect(parseOAuthScopes('offline_access mcp:read admin')).toEqual([
      'mcp:read',
    ]);
  });
});

describe('scopesAllowWrite', () => {
  it('is true only with mcp:write', () => {
    expect(scopesAllowWrite(['mcp:read', 'mcp:write'])).toBe(true);
    expect(scopesAllowWrite(['mcp:read'])).toBe(false);
  });
});

describe('isRegistrableRedirectUri', () => {
  it('accepts https, loopback http and private-use schemes', () => {
    expect(isRegistrableRedirectUri('https://client.example.com/cb')).toBe(
      true,
    );
    expect(isRegistrableRedirectUri('http://127.0.0.1:33418/callback')).toBe(
      true,
    );
    expect(isRegistrableRedirectUri('http://localhost/callback')).toBe(true);
    expect(
      isRegistrableRedirectUri('cursor://anysphere.cursor-mcp/oauth/callback'),
    ).toBe(true);
  });

  it('rejects remote http, fragments, userinfo and dangerous schemes', () => {
    expect(isRegistrableRedirectUri('http://client.example.com/cb')).toBe(
      false,
    );
    expect(isRegistrableRedirectUri('https://client.example.com/cb#x')).toBe(
      false,
    );
    expect(
      isRegistrableRedirectUri('https://user:pw@client.example.com/cb'),
    ).toBe(false);
    expect(isRegistrableRedirectUri('javascript:alert(1)')).toBe(false);
    expect(isRegistrableRedirectUri('data:text/html,hi')).toBe(false);
    expect(isRegistrableRedirectUri('not a url')).toBe(false);
  });
});

describe('redirectUriMatches', () => {
  it('matches exactly', () => {
    expect(
      redirectUriMatches(['https://a.example/cb'], 'https://a.example/cb'),
    ).toBe(true);
    expect(
      redirectUriMatches(['https://a.example/cb'], 'https://a.example/cb2'),
    ).toBe(false);
  });

  it('ignores the port on loopback http only', () => {
    expect(
      redirectUriMatches(
        ['http://127.0.0.1/callback'],
        'http://127.0.0.1:51234/callback',
      ),
    ).toBe(true);
    expect(
      redirectUriMatches(
        ['http://127.0.0.1/callback'],
        'http://127.0.0.1:51234/other',
      ),
    ).toBe(false);
    expect(
      redirectUriMatches(
        ['http://127.0.0.1/callback'],
        'http://localhost:51234/callback',
      ),
    ).toBe(false);
    expect(
      redirectUriMatches(['https://a.example/cb'], 'https://a.example:8443/cb'),
    ).toBe(false);
  });
});
