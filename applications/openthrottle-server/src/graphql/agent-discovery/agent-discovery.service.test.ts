/**
 * @description Tests for AgentDiscoveryService: the in-process TTL cache and the
 * in-flight coalescing that shares a single CLI sweep across concurrent
 * cache-miss callers (parity with NestjsModelDiscoveryService). The
 * `discoverAgentClis` core is mocked — no real spawning.
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

  it('serves the cached snapshot within the TTL window', async () => {
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

  it('re-scans once the TTL has expired', async () => {
    const service = await buildService();
    vi.useFakeTimers();

    await service.discover();
    expect(discoverAgentClisMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);

    await service.discover();
    expect(discoverAgentClisMock).toHaveBeenCalledTimes(2);
  });
});
