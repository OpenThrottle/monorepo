import { describe, expect, it } from 'vitest';
import { maskCredentialToken } from './mcp-connector-credential.util';

describe('maskCredentialToken', () => {
  it('reveals only a short head and tail for a long token', () => {
    expect(maskCredentialToken('sk_live_0123456789abcdef')).toBe('sk_l…cdef');
  });

  it('fully masks short tokens so no meaningful portion leaks', () => {
    expect(maskCredentialToken('short')).toBe('…');
    expect(maskCredentialToken('12345678')).toBe('…');
  });

  it('trims surrounding whitespace before masking', () => {
    expect(maskCredentialToken('  sk_live_0123456789abcdef  ')).toBe(
      'sk_l…cdef',
    );
  });
});
