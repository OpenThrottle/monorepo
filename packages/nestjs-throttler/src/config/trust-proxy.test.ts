import { describe, expect, it } from 'vitest';

import { DEFAULT_TRUST_PROXY, resolveTrustProxy } from './trust-proxy.ts';

describe('resolveTrustProxy', () => {
  it('defaults to private-network peers when unset or blank', () => {
    expect(resolveTrustProxy(undefined)).toBe(DEFAULT_TRUST_PROXY);
    expect(resolveTrustProxy('  ')).toBe(DEFAULT_TRUST_PROXY);
  });

  it('turns trust off for false / off / 0', () => {
    expect(resolveTrustProxy('false')).toBe(false);
    expect(resolveTrustProxy('OFF')).toBe(false);
    expect(resolveTrustProxy('0')).toBe(false);
  });

  it('reads a positive integer as a hop count', () => {
    expect(resolveTrustProxy('2')).toBe(2);
  });

  it('passes a subnet or preset list through', () => {
    expect(resolveTrustProxy('10.0.0.0/8, loopback')).toBe(
      '10.0.0.0/8, loopback',
    );
  });
});
