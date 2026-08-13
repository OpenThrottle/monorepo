import { describe, expect, it } from 'vitest';
import {
  findMissingBootstrapKeys,
  REQUIRED_BOOTSTRAP_KEYS,
} from '../check-bootstrap-secrets.ts';

/** A record with every required key set to a non-empty value. */
function completeEntries(): Record<string, string> {
  return Object.fromEntries(
    REQUIRED_BOOTSTRAP_KEYS.map((key) => [key, `value-${key}`]),
  );
}

describe('findMissingBootstrapKeys', () => {
  it('returns nothing for a complete file', () => {
    expect(findMissingBootstrapKeys(completeEntries())).toEqual([]);
  });

  it('names a single missing key (the observed MCP-token regression)', () => {
    const entries = completeEntries();
    delete entries.OPENTHROTTLE_MCP_AUTH_TOKEN;

    expect(findMissingBootstrapKeys(entries)).toEqual([
      'OPENTHROTTLE_MCP_AUTH_TOKEN',
    ]);
  });

  it('treats an empty or whitespace-only value as missing', () => {
    const entries = completeEntries();
    entries.OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN = '   ';

    expect(findMissingBootstrapKeys(entries)).toEqual([
      'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN',
    ]);
  });

  it('reports every missing key in canonical order for an empty file', () => {
    expect(findMissingBootstrapKeys({})).toEqual([...REQUIRED_BOOTSTRAP_KEYS]);
  });

  it('requires exactly the six documented keys', () => {
    expect(REQUIRED_BOOTSTRAP_KEYS).toHaveLength(6);
    expect(REQUIRED_BOOTSTRAP_KEYS).toContain('OPENTHROTTLE_MCP_AUTH_TOKEN');
    expect(REQUIRED_BOOTSTRAP_KEYS).toContain(
      'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN',
    );
  });
});
