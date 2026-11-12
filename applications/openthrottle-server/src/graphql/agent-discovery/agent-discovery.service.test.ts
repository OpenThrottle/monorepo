/**
 * @description Tests for AgentDiscoveryService: the stale-while-revalidate cache
 * (soft/hard TTL, in-flight coalescing, background refresh) wired over the
 * `discoverAgentClis` core, which is mocked here — no real spawning.
 */

import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { AgentCliDiscoveryResult } from '@openthrottle/openthrottle-agentic-utils';
import { discoverAgentClis } from '@openthrottle/openthrottle-agentic-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentDiscoveryService } from './agent-discovery.service.ts';

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-utils')
    >();
  return { ...actual, discoverAgentClis: vi.fn() };
});

const discoverAgentClisMock = vi.mocked(discoverAgentClis);

const AUTH_STATE = { detail: null, status: 'unknown' } as const;
const CAPABILITIES = {
  approvals: false,
  editApprovals: false,
  imageInput: false,
  mcpInjection: false,
  replaysFullHistory: false,
  resume: true,
  steering: false,
} as const;

const SNAPSHOT: AgentCliDiscoveryResult = {
  agents: [
    {
      attachesWorkspaceMcp: true,
      auth: null,
      authState: AUTH_STATE,
      available: true,
      backend: 'cursor',
      capabilities: CAPABILITIES,
      chatCapable: true,
      label: 'Cursor Agent',
      models: ['auto'],
      supportsCustomBaseUrl: false,
      timedOut: false,
      version: '2026.06.15',
    },
    {
      attachesWorkspaceMcp: true,
      auth: null,
      authState: AUTH_STATE,
      available: false,
      backend: 'claude',
      capabilities: CAPABILITIES,
      chatCapable: true,
      label: 'Claude Code',
      models: [],
      supportsCustomBaseUrl: false,
      timedOut: false,
      version: null,
    },
  ],
  scannedAt: '2026-06-19T00:00:00.000Z',
};

/** A distinct snapshot so a background refresh is observable by identity. */
const REFRESHED: AgentCliDiscoveryResult = {
  ...SNAPSHOT,
  scannedAt: '2026-06-19T01:00:00.000Z',
};

/** Flush pending microtasks so a background refresh's stamping runs. */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function buildService(): Promise<AgentDiscoveryService> {
  const app = await Test.createTestingModule({
    providers: [
      AgentDiscoveryService,
      { provide: LoggerService, useValue: createMock<LoggerService>() },
    ],
  }).compile();
  return app.get(AgentDiscoveryService);
}

beforeEach(() => {
  discoverAgentClisMock.mockReset();
  discoverAgentClisMock.mockResolvedValue(SNAPSHOT);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete process.env.AGENT_DISCOVERY_CACHE_TTL_MS;
  delete process.env.AGENT_DISCOVERY_HARD_TTL_MS;
  delete process.env.AGENT_DISCOVERY_WARM_ON_BOOT;
});

describe('AgentDiscoveryService', () => {
  it('runs a scan and returns the discovery snapshot on a cold cache', async () => {
    const service = await buildService();
    const result = await service.discover();
    expect(result).toBe(SNAPSHOT);
    expect(discoverAgentClisMock).toHaveBeenCalledTimes(1);
    expect(discoverAgentClisMock.mock.calls[0]?.[0]).toEqual({
      scannedAt: expect.any(String),
    });
  });

  it('serves the cached snapshot within the soft TTL window', async () => {
    const service = await buildService();
    const first = await service.discover();
    const second = await service.discover();
    expect(second).toBe(first);
    expect(discoverAgentClisMock).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent cold-cache callers into exactly one scan', async () => {
    const service = await buildService();

    // Hold the scan open so every concurrent caller arrives while it is still
    // in flight, then release it and assert only one sweep ever ran.
    let releaseScan: (result: AgentCliDiscoveryResult) => void = () => {};
    discoverAgentClisMock.mockReturnValueOnce(
      new Promise<AgentCliDiscoveryResult>((resolve) => {
        releaseScan = resolve;
      }),
    );

    const inflight = [
      service.discover(),
      service.discover(),
      service.discover(),
      service.discover(),
      service.discover(),
    ];

    expect(discoverAgentClisMock).toHaveBeenCalledTimes(1);

    releaseScan(SNAPSHOT);
    const results = await Promise.all(inflight);

    expect(discoverAgentClisMock).toHaveBeenCalledTimes(1);
    for (const result of results) {
      expect(result).toBe(SNAPSHOT);
    }
  });

  it('serves the stale snapshot and schedules one background refresh past the soft TTL', async () => {
    discoverAgentClisMock.mockReset();
    discoverAgentClisMock
      .mockResolvedValueOnce(SNAPSHOT)
      .mockResolvedValue(REFRESHED);

    const service = await buildService();
    vi.useFakeTimers();

    const first = await service.discover();
    expect(first).toBe(SNAPSHOT);
    expect(discoverAgentClisMock).toHaveBeenCalledTimes(1);

    // Past the soft TTL (60s) but within the hard TTL (600s).
    vi.advanceTimersByTime(120_000);
    const stale = await service.discover();
    expect(stale).toBe(SNAPSHOT); // last-good, served synchronously
    expect(discoverAgentClisMock).toHaveBeenCalledTimes(2); // one background sweep

    await flush();
    const fresh = await service.discover();
    expect(fresh).toBe(REFRESHED);
    expect(discoverAgentClisMock).toHaveBeenCalledTimes(2); // no extra sweep
  });

  it('blocks on a fresh scan once past the hard TTL', async () => {
    discoverAgentClisMock.mockReset();
    discoverAgentClisMock
      .mockResolvedValueOnce(SNAPSHOT)
      .mockResolvedValue(REFRESHED);

    const service = await buildService();
    vi.useFakeTimers();

    await service.discover();
    vi.advanceTimersByTime(700_000); // past hard TTL (600s)
    const result = await service.discover();

    expect(result).toBe(REFRESHED); // freshly loaded, not the stale snapshot
    expect(discoverAgentClisMock).toHaveBeenCalledTimes(2);
  });

  it('honors AGENT_DISCOVERY_CACHE_TTL_MS to shorten the fresh window', async () => {
    process.env.AGENT_DISCOVERY_CACHE_TTL_MS = '1000';
    const service = await buildService();
    vi.useFakeTimers();

    await service.discover();
    expect(discoverAgentClisMock).toHaveBeenCalledTimes(1);

    // Within the default 60s but past the overridden 1s soft TTL -> stale +
    // background refresh.
    vi.advanceTimersByTime(1_500);
    await service.discover();
    expect(discoverAgentClisMock).toHaveBeenCalledTimes(2);
  });
});

describe('AgentDiscoveryService probe-timeout carry-forward', () => {
  const [cursor, claude] = SNAPSHOT.agents;

  /** A sweep where cursor's probe timed out (unavailable, no models). */
  const cursorTimedOut = (): AgentCliDiscoveryResult => {
    if (cursor === undefined || claude === undefined) {
      throw new Error('SNAPSHOT fixture is missing an agent');
    }

    return {
      agents: [
        { ...cursor, available: false, models: [], timedOut: true },
        claude,
      ],
      scannedAt: '2026-06-19T02:00:00.000Z',
    };
  };

  describe('when a later sweep times out on an agent the previous sweep found', () => {
    it('keeps the previous entry for that agent', async () => {
      const service = await buildService();
      await service.discover();

      discoverAgentClisMock.mockResolvedValueOnce(cursorTimedOut());
      service.invalidate();
      const result = await service.discover();

      expect(result.agents[0]).toBe(cursor);
      expect(result.agents[1]).toBe(claude);
      expect(result.scannedAt).toBe('2026-06-19T02:00:00.000Z');
    });
  });

  describe('when the very first sweep times out', () => {
    it('serves the timed-out entry (nothing to carry forward)', async () => {
      discoverAgentClisMock.mockResolvedValueOnce(cursorTimedOut());
      const service = await buildService();
      const result = await service.discover();

      expect(result.agents[0]).toMatchObject({
        available: false,
        timedOut: true,
      });
    });
  });

  describe('when a later sweep answers that the agent is gone', () => {
    it('drops it (only a timeout is carried forward)', async () => {
      const service = await buildService();
      await service.discover();

      const gone: AgentCliDiscoveryResult = {
        agents: SNAPSHOT.agents.map((agent) => {
          return { ...agent, available: false, models: [] };
        }),
        scannedAt: '2026-06-19T03:00:00.000Z',
      };
      discoverAgentClisMock.mockResolvedValueOnce(gone);
      service.invalidate();
      const result = await service.discover();

      expect(result).toBe(gone);
    });
  });
});

describe('AgentDiscoveryService boot warm-up', () => {
  const [cursor, claude] = SNAPSHOT.agents;

  /** A first sweep where cursor's probe timed out. */
  const firstSweepTimedOut = (): AgentCliDiscoveryResult => {
    if (cursor === undefined || claude === undefined) {
      throw new Error('SNAPSHOT fixture is missing an agent');
    }

    return {
      agents: [
        { ...cursor, available: false, models: [], timedOut: true },
        claude,
      ],
      scannedAt: '2026-06-19T04:00:00.000Z',
    };
  };

  describe('when AGENT_DISCOVERY_WARM_ON_BOOT is unset under the test runner', () => {
    it('does not sweep on bootstrap', async () => {
      const service = await buildService();
      service.onApplicationBootstrap();
      await flush();

      expect(discoverAgentClisMock).not.toHaveBeenCalled();
    });
  });

  describe('when AGENT_DISCOVERY_WARM_ON_BOOT is falsy', () => {
    it('does not sweep on bootstrap', async () => {
      process.env.AGENT_DISCOVERY_WARM_ON_BOOT = 'false';
      const service = await buildService();
      service.onApplicationBootstrap();
      await flush();

      expect(discoverAgentClisMock).not.toHaveBeenCalled();
    });
  });

  describe('when AGENT_DISCOVERY_WARM_ON_BOOT is on', () => {
    beforeEach(() => {
      process.env.AGENT_DISCOVERY_WARM_ON_BOOT = 'true';
    });

    it('sweeps once without blocking bootstrap, and the first request reuses it', async () => {
      const service = await buildService();

      expect(service.onApplicationBootstrap()).toBeUndefined();
      expect(discoverAgentClisMock).toHaveBeenCalledTimes(1);

      const result = await service.discover();

      expect(result).toBe(SNAPSHOT);
      expect(discoverAgentClisMock).toHaveBeenCalledTimes(1);
    });

    it('shares an in-flight warm sweep with a request that arrives mid-sweep', async () => {
      let releaseScan: (result: AgentCliDiscoveryResult) => void = () => {};
      discoverAgentClisMock.mockReturnValueOnce(
        new Promise<AgentCliDiscoveryResult>((resolve) => {
          releaseScan = resolve;
        }),
      );

      const service = await buildService();
      service.onApplicationBootstrap();
      const request = service.discover();

      releaseScan(SNAPSHOT);

      await expect(request).resolves.toBe(SNAPSHOT);
      expect(discoverAgentClisMock).toHaveBeenCalledTimes(1);
    });

    it('retries once when the boot sweep had a timed-out probe', async () => {
      discoverAgentClisMock
        .mockResolvedValueOnce(firstSweepTimedOut())
        .mockResolvedValueOnce(SNAPSHOT);

      const service = await buildService();
      service.onApplicationBootstrap();
      await vi.waitFor(() => {
        expect(discoverAgentClisMock).toHaveBeenCalledTimes(2);
      });
      await flush();

      const result = await service.discover();

      expect(result).toBe(SNAPSHOT);
      expect(discoverAgentClisMock).toHaveBeenCalledTimes(2);
    });

    it('never throws when the boot sweep fails', async () => {
      discoverAgentClisMock.mockRejectedValueOnce(new Error('spawn failed'));
      const logger = createMock<LoggerService>();
      const app = await Test.createTestingModule({
        providers: [
          AgentDiscoveryService,
          { provide: LoggerService, useValue: logger },
        ],
      }).compile();
      const service = app.get(AgentDiscoveryService);

      service.onApplicationBootstrap();

      await vi.waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('boot warm-up failed: spawn failed'),
        );
      });
    });
  });
});
