import { describe, expect, it } from 'vitest';

import { toExternalUrl } from './to-external-url.ts';

describe('toExternalUrl', () => {
  it('accepts http and https and normalises', () => {
    expect(toExternalUrl('https://example.com')).toBe('https://example.com/');
    expect(toExternalUrl('http://localhost:6021/health')).toBe(
      'http://localhost:6021/health',
    );
  });

  it('refuses every other scheme', () => {
    for (const url of [
      'mailto:a@b.co',
      'file:///etc/passwd',
      'javascript:alert(1)',
      'data:text/html,hi',
      'ssh://host',
      'ms-msdt:/id',
    ]) {
      expect(toExternalUrl(url)).toBeUndefined();
    }
  });

  it('refuses unparseable input', () => {
    expect(toExternalUrl('')).toBeUndefined();
    expect(toExternalUrl('example.com')).toBeUndefined();
  });
});
