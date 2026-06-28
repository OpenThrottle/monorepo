import { describe, expect, it } from 'vitest';

import {
  assertSafeWebURL,
  getWebURLRejectionReason,
  isSafeWebURL,
} from './url-guard';

describe('url-guard', () => {
  describe('safe URLs', () => {
    const safe = [
      'http://example.com',
      'https://example.com/path?query=1',
      'https://sub.example.com:8443/doc',
      'https://8.8.8.8/page',
      'https://203.0.113.10/page',
    ];

    it.each(safe)('accepts %s', (url) => {
      expect(getWebURLRejectionReason(url)).toBeNull();
      expect(isSafeWebURL(url)).toBe(true);
      expect(() => assertSafeWebURL(url)).not.toThrow();
    });
  });

  describe('disallowed schemes', () => {
    const unsafe = [
      'file:///etc/passwd',
      'ftp://example.com/x',
      'gopher://example.com',
      'data:text/plain,hi',
    ];

    it.each(unsafe)('rejects %s', (url) => {
      expect(isSafeWebURL(url)).toBe(false);
    });
  });

  describe('loopback and metadata hosts', () => {
    const unsafe = [
      'http://localhost/admin',
      'http://localhost:3000/admin',
      'http://service.localhost/',
      'http://127.0.0.1/',
      'http://0.0.0.0/',
      'http://[::1]/',
      'http://metadata.google.internal/computeMetadata/v1/',
      'http://169.254.169.254/latest/meta-data/',
    ];

    it.each(unsafe)('rejects %s', (url) => {
      expect(isSafeWebURL(url)).toBe(false);
      expect(() => assertSafeWebURL(url)).toThrow(/unsafe URL/);
    });
  });

  describe('private IPv4 ranges', () => {
    const unsafe = [
      'http://10.0.0.5/',
      'http://172.16.0.1/',
      'http://172.31.255.255/',
      'http://192.168.1.1/',
      'http://169.254.0.1/',
    ];

    it.each(unsafe)('rejects %s', (url) => {
      expect(isSafeWebURL(url)).toBe(false);
    });

    it('allows public ranges adjacent to private blocks', () => {
      expect(isSafeWebURL('http://172.15.0.1/')).toBe(true);
      expect(isSafeWebURL('http://172.32.0.1/')).toBe(true);
      expect(isSafeWebURL('http://192.169.0.1/')).toBe(true);
    });
  });

  describe('private IPv6 ranges', () => {
    const unsafe = [
      'http://[fc00::1]/',
      'http://[fd12:3456::1]/',
      'http://[fe80::1]/',
      'http://[::ffff:10.0.0.1]/',
    ];

    it.each(unsafe)('rejects %s', (url) => {
      expect(isSafeWebURL(url)).toBe(false);
    });
  });

  describe('malformed input', () => {
    it('rejects unparseable URLs', () => {
      expect(isSafeWebURL('not a url')).toBe(false);
      expect(isSafeWebURL('')).toBe(false);
    });
  });
});
