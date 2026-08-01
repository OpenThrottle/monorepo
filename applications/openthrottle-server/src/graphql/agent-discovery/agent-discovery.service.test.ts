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

import { AgentDiscoveryService } from './agent-discovery.service';

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-utils')
    >();
  return { ...actual, discoverAgentClis: vi.fn() };
});

const discoverAgentClisMock = vi.mocked(discoverAgentClis);

const SNAPSHOT: AgentCliDiscoveryResult = {
  agents: [
    {
      available: true,
      backend: 'cursor',
      chatCapable: true,
      label: 'Cursor Agent',
      models: ['auto'],
      supportsCustomBaseUrl: false,
      version: '2026.06.15',
    },
    {
      available: false,
      backend: 'claude',
      chatCapable: true,
      label: 'Claude Code',
      models: [],
      supportsCustomBaseUrl: false,
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
});

describe('AgentDiscoveryService', () => {
  it('runs a scan and returns the discovery snapshot on a cold cache', async () => {
    const service = await buildService();
    const result = await service.discover();
    expect(result).toBe(SNAPSHOT);
    expect(discoverAgentClisMock).toHaveBeenCalledTimes(1);
    expect(discoverAgentClisMock.mock.calls[0][0]).toEqual({
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
