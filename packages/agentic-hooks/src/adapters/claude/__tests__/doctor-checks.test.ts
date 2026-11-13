import { describe, expect, it } from 'vitest';

import type { BufferStats } from '../../../data/readBufferStats.ts';
import {
  checkBuffer,
  checkEndpoint,
  checkHeartbeat,
  checkOffline,
  checkPlugin,
  checkReachability,
  checkToken,
  formatAge,
  isOlderVersion,
  parseHeartbeatReceipt,
  summarizeChecks,
} from '../doctor-checks.ts';

const NOW = Date.parse('2026-11-13T12:00:00.000Z');
const DRAIN = '/opt/hooks/skill-usage-drain.cjs';

const emptyStats: BufferStats = {
  files: [
    { deadLetterLines: 0, label: 'events', lines: 0, oldestAt: null },
    { deadLetterLines: 0, label: 'outcomes', lines: 0, oldestAt: null },
  ],
  oldestAt: null,
  totalDeadLetterLines: 0,
  totalLines: 0,
};

const statsWith = (overrides: Partial<BufferStats>): BufferStats => {
  return { ...emptyStats, ...overrides };
};

describe('checkPlugin', () => {
  describe('when the plugin is absent', () => {
    it('warns with both install commands and the typed-in-Claude note', () => {
      const result = checkPlugin({
        install: { installed: false, version: null },
        payloadVersion: '1.2.0',
      });
      expect(result.status).toBe('WARN');
      expect(result.fix).toContain(
        'claude plugin marketplace add OpenThrottle/monorepo',
      );
      expect(result.fix).toContain(
        'claude plugin install openthrottle@openthrottle',
      );
      expect(result.fix).toContain('restart Claude Code');
    });

    it('treats an unreadable registry the same way', () => {
      const result = checkPlugin({
        install: { installed: null, version: null },
        payloadVersion: null,
      });
      expect(result.status).toBe('WARN');
    });
  });

  describe('when the plugin is outdated', () => {
    it('warns with the update command', () => {
      const result = checkPlugin({
        install: { installed: true, version: '1.1.0' },
        payloadVersion: '1.2.0',
      });
      expect(result.status).toBe('WARN');
      expect(result.fix).toContain(
        'claude plugin update openthrottle@openthrottle',
      );
    });
  });

  describe('when the plugin is current', () => {
    it('passes and names the version', () => {
      const result = checkPlugin({
        install: { installed: true, version: '1.2.0' },
        payloadVersion: '1.2.0',
      });
      expect(result).toEqual({
        detail: 'openthrottle@openthrottle 1.2.0 installed',
        fix: null,
        id: 'plugin',
        status: 'PASS',
      });
    });

    it('skips the comparison when the payload version is unknown', () => {
      const result = checkPlugin({
        install: { installed: true, version: '0.0.1' },
        payloadVersion: null,
      });
      expect(result.status).toBe('PASS');
    });
  });
});

describe('isOlderVersion', () => {
  it('compares numerically, not lexically', () => {
    expect(isOlderVersion('1.9.0', '1.10.0')).toBe(true);
    expect(isOlderVersion('1.10.0', '1.9.0')).toBe(false);
    expect(isOlderVersion('1.2.0', '1.2.0')).toBe(false);
  });

  it('is false when either side does not parse', () => {
    expect(isOlderVersion('latest', '1.2.0')).toBe(false);
  });
});

describe('checkEndpoint', () => {
  it('fails with the exact env line when no URL resolves', () => {
    const result = checkEndpoint({ layer: null, url: null });
    expect(result.status).toBe('FAIL');
    expect(result.fix).toContain('OPENTHROTTLE_GRAPHQL_URL=');
    expect(result.fix).toContain('~/.openthrottle/.env');
  });

  it('passes and shows which layer answered', () => {
    const result = checkEndpoint({
      layer: 'user-env',
      url: 'http://localhost:6021/graphql',
    });
    expect(result.status).toBe('PASS');
    expect(result.detail).toContain('~/.openthrottle/.env');
  });
});

describe('checkToken', () => {
  it('fails with the exact env line when absent', () => {
    const result = checkToken({ layer: null, present: false });
    expect(result.status).toBe('FAIL');
    expect(result.fix).toContain('OPENTHROTTLE_MCP_AUTH_TOKEN=');
  });

  it('reports presence and layer only', () => {
    const result = checkToken({ layer: 'process-env', present: true });
    expect(result).toEqual({
      detail: 'present (from process env)',
      fix: null,
      id: 'token',
      status: 'PASS',
    });
  });
});

describe('checkReachability', () => {
  const origin = 'http://localhost:6021';

  it('passes on a 2xx', () => {
    const result = checkReachability({
      origin,
      probe: { kind: 'ok', ms: 12, status: 200 },
    });
    expect(result.status).toBe('PASS');
  });

  it('fails on a non-2xx with a fix', () => {
    const result = checkReachability({
      origin,
      probe: { kind: 'http', status: 503 },
    });
    expect(result.status).toBe('FAIL');
    expect(result.detail).toContain('503');
    expect(result.fix).not.toBeNull();
  });

  it('fails on a timeout with a fix', () => {
    const result = checkReachability({ origin, probe: { kind: 'timeout' } });
    expect(result.status).toBe('FAIL');
    expect(result.detail).toContain('timed out');
    expect(result.fix).not.toBeNull();
  });

  it('fails on a network error', () => {
    const result = checkReachability({
      origin,
      probe: { kind: 'error', reason: 'ECONNREFUSED' },
    });
    expect(result.status).toBe('FAIL');
    expect(result.detail).toContain('ECONNREFUSED');
  });

  it('warns when there was nothing to probe', () => {
    const result = checkReachability({
      origin: null,
      probe: { kind: 'skipped' },
    });
    expect(result.status).toBe('WARN');
  });
});

describe('checkBuffer', () => {
  it('passes when empty', () => {
    const result = checkBuffer({
      drainCommand: DRAIN,
      nowMs: NOW,
      serverHealthy: true,
      stats: emptyStats,
    });
    expect(result.status).toBe('PASS');
  });

  describe('when records are buffered and the server is healthy', () => {
    it('warns with the drain command', () => {
      const result = checkBuffer({
        drainCommand: DRAIN,
        nowMs: NOW,
        serverHealthy: true,
        stats: statsWith({
          files: [
            {
              deadLetterLines: 0,
              label: 'events',
              lines: 3,
              oldestAt: '2026-11-13T11:00:00.000Z',
            },
          ],
          oldestAt: '2026-11-13T11:00:00.000Z',
          totalLines: 3,
        }),
      });
      expect(result.status).toBe('WARN');
      expect(result.fix).toBe(`node ${DRAIN}`);
      expect(result.detail).toContain('events=3');
    });
  });

  describe('when records are buffered and the server is down', () => {
    it('warns without suggesting a drain that cannot work', () => {
      const result = checkBuffer({
        drainCommand: DRAIN,
        nowMs: NOW,
        serverHealthy: false,
        stats: statsWith({ totalLines: 2 }),
      });
      expect(result.status).toBe('WARN');
      expect(result.fix).not.toContain('node ');
    });
  });

  describe('when there are dead letters', () => {
    it('warns with --replay-dead-letter', () => {
      const result = checkBuffer({
        drainCommand: DRAIN,
        nowMs: NOW,
        serverHealthy: true,
        stats: statsWith({ totalDeadLetterLines: 4 }),
      });
      expect(result.status).toBe('WARN');
      expect(result.fix).toContain(`node ${DRAIN} --replay-dead-letter`);
      expect(result.detail).toContain('4 dead-lettered');
    });
  });

  describe('when the oldest record is over 24h old', () => {
    it('says so', () => {
      const result = checkBuffer({
        drainCommand: DRAIN,
        nowMs: NOW,
        serverHealthy: true,
        stats: statsWith({
          oldestAt: '2026-11-11T12:00:00.000Z',
          totalLines: 1,
        }),
      });
      expect(result.status).toBe('WARN');
      expect(result.detail).toContain('over 24h');
    });
  });
});

describe('checkHeartbeat', () => {
  it('warns when there is no receipt', () => {
    const result = checkHeartbeat({ nowMs: NOW, receipt: null });
    expect(result.status).toBe('WARN');
    expect(result.detail).toContain('no session has started');
  });

  it('warns with the error when undelivered', () => {
    const result = checkHeartbeat({
      nowMs: NOW,
      receipt: {
        attemptedAt: '2026-11-13T11:00:00.000Z',
        delivered: false,
        error: 'no endpoint',
      },
    });
    expect(result.status).toBe('WARN');
    expect(result.detail).toContain('no endpoint');
  });

  it('passes with the age when delivered', () => {
    const result = checkHeartbeat({
      nowMs: NOW,
      receipt: {
        attemptedAt: '2026-11-13T09:00:00.000Z',
        delivered: true,
        error: null,
      },
    });
    expect(result.status).toBe('PASS');
    expect(result.detail).toContain('3h ago');
  });
});

describe('parseHeartbeatReceipt', () => {
  it('returns null for missing, malformed and foreign-shaped text', () => {
    expect(parseHeartbeatReceipt(null)).toBeNull();
    expect(parseHeartbeatReceipt('{nope')).toBeNull();
    expect(parseHeartbeatReceipt('{"delivered":true}')).toBeNull();
  });
});

describe('checkOffline', () => {
  it('warns when the switch is on', () => {
    const result = checkOffline({ offline: true });
    expect(result.status).toBe('WARN');
    expect(result.fix).toContain('unset OPENTHROTTLE_TELEMETRY_OFFLINE');
  });

  it('passes when it is off', () => {
    expect(checkOffline({ offline: false }).status).toBe('PASS');
  });
});

describe('formatAge and summarizeChecks', () => {
  it('formats minutes, hours and days', () => {
    expect(formatAge(5 * 60_000)).toBe('5m');
    expect(formatAge(3 * 3_600_000)).toBe('3h');
    expect(formatAge(72 * 3_600_000)).toBe('3d');
  });

  it('counts results by status', () => {
    expect(
      summarizeChecks([
        checkOffline({ offline: true }),
        checkOffline({ offline: false }),
        checkToken({ layer: null, present: false }),
      ]),
    ).toEqual({ fail: 1, pass: 1, warn: 1 });
  });
});
