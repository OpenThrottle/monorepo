/**
 * @description Tests for AgentDiscoveryResolver: maps the cached
 * AgentCliDiscoveryResult from the injected AgentDiscoveryService into the
 * ListResult-style payload, surfacing only AVAILABLE agents. The service is
 * mocked — no spawning.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { AgentCliDiscoveryResult } from '@openthrottle/openthrottle-agentic-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentDiscoveryResolver } from './agent-discovery.resolver';
import { AgentDiscoveryService } from './agent-discovery.service';

const SNAPSHOT: AgentCliDiscoveryResult = {
  agents: [
    {
      available: true,
      backend: 'cursor',
      chatCapable: true,
      label: 'Cursor Agent',
      models: ['auto', 'gpt-5.2'],
      version: '2026.06.15',
    },
    {
      available: false,
      backend: 'claude',
      chatCapable: true,
      label: 'Claude Code',
      models: [],
      version: null,
    },
    {
      available: true,
      backend: 'opencode',
      chatCapable: true,
      label: 'OpenCode',
      models: ['opencode/big-pickle'],
      version: '1.18.5',
    },
  ],
  scannedAt: '2026-06-19T00:00:00.000Z',
};

describe('AgentDiscoveryResolver', () => {
  let service: AgentDiscoveryService;
  let resolver: AgentDiscoveryResolver;

  beforeEach(() => {
    service = createMock<AgentDiscoveryService>();
    vi.mocked(service.discover).mockResolvedValue(SNAPSHOT);
    resolver = new AgentDiscoveryResolver(service);
  });

  it('surfaces only available agents (cursor + opencode, not the unavailable claude)', async () => {
    const result = await resolver.discoverAgentClis();
    expect(service.discover).toHaveBeenCalledWith();
    expect(result.scannedAt).toBe('2026-06-19T00:00:00.000Z');
    expect(result.totalCount).toBe(2);
    expect(result.agents).toEqual([
      { backend: 'cursor', label: 'Cursor Agent', version: '2026.06.15' },
      { backend: 'opencode', label: 'OpenCode', version: '1.18.5' },
    ]);
  });

  it('returns an empty payload when no agent CLIs are available', async () => {
    vi.mocked(service.discover).mockResolvedValue({
      agents: [
        {
          available: false,
          backend: 'cursor',
          chatCapable: true,
          label: 'Cursor Agent',
          models: [],
          version: null,
        },
      ],
      scannedAt: '2026-06-19T00:00:00.000Z',
    });
    const result = await resolver.discoverAgentClis();
    expect(result.totalCount).toBe(0);
    expect(result.agents).toEqual([]);
  });
});
