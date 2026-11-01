import { describe, expect, it } from 'vitest';

import { isHostAllowed, parseTailnetStatus } from '../remote-serve.ts';

describe('parseTailnetStatus', () => {
  it('reads state, hostname without the trailing dot, and HTTPS availability', () => {
    const json = JSON.stringify({
      BackendState: 'Running',
      CertDomains: ['mac.tail1234.ts.net'],
      Self: { DNSName: 'mac.tail1234.ts.net.' },
    });

    expect(parseTailnetStatus(json)).toEqual({
      hostname: 'mac.tail1234.ts.net',
      httpsEnabled: true,
      state: 'Running',
    });
  });

  it('reports HTTPS as disabled when the tailnet has no certificate domains', () => {
    const json = JSON.stringify({
      BackendState: 'Running',
      CertDomains: null,
      Self: { DNSName: 'mac.tail1234.ts.net.' },
    });

    expect(parseTailnetStatus(json)?.httpsEnabled).toBe(false);
  });

  it('passes a logged-out state through for the caller to report', () => {
    const json = JSON.stringify({ BackendState: 'NeedsLogin', Self: null });

    expect(parseTailnetStatus(json)).toEqual({
      hostname: '',
      httpsEnabled: false,
      state: 'NeedsLogin',
    });
  });

  it('returns undefined for output that is not status JSON', () => {
    expect(parseTailnetStatus('')).toBeUndefined();
    expect(parseTailnetStatus('failed to connect')).toBeUndefined();
    expect(parseTailnetStatus('{}')).toBeUndefined();
  });
});

describe('isHostAllowed', () => {
  it('matches an exact entry in a comma-separated list', () => {
    expect(
      isHostAllowed(
        'developer.local, mac.tail1234.ts.net',
        'mac.tail1234.ts.net',
      ),
    ).toBe(true);
  });

  it('does not match a missing or partial entry', () => {
    expect(isHostAllowed('', 'mac.tail1234.ts.net')).toBe(false);
    expect(isHostAllowed('tail1234.ts.net', 'mac.tail1234.ts.net')).toBe(false);
  });
});
