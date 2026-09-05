/**
 * @description Tests for AgentDiscoveryResolver: maps the cached
 * AgentCliDiscoveryResult from the injected AgentDiscoveryService into the
 * ListResult-style payload, surfacing only AVAILABLE agents. The service is
 * mocked — no spawning.
 */

import { createMock } from '@golevelup/ts-vitest';
import {
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import type { AgentCliDiscoveryResult } from '@openthrottle/openthrottle-agentic-utils';
import type { AgentCliPreferencesService } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentDiscoveryResolver } from './agent-discovery.resolver';
import type { AgentDiscoveryService } from './agent-discovery.service';

const human: AuthPrincipal = { kind: AUTH_PRINCIPAL_KIND_USER, sub: 'user-1' };

const SNAPSHOT: AgentCliDiscoveryResult = {
  agents: [
    {
      attachesWorkspaceMcp: true,
      available: true,
      backend: 'cursor',
      chatCapable: true,
      label: 'Cursor Agent',
      models: ['auto', 'gpt-5.2'],
      supportsCustomBaseUrl: false,
      version: '2026.06.15',
    },
    {
      attachesWorkspaceMcp: true,
      available: false,
      backend: 'claude',
      chatCapable: true,
      label: 'Claude Code',
      models: [],
      supportsCustomBaseUrl: false,
      version: null,
    },
    {
      attachesWorkspaceMcp: true,
      available: true,
      backend: 'opencode',
      chatCapable: true,
      label: 'OpenCode',
      models: ['opencode/big-pickle'],
      supportsCustomBaseUrl: true,
      version: '1.18.5',
    },
  ],
  scannedAt: '2026-06-19T00:00:00.000Z',
};

describe('AgentDiscoveryResolver', () => {
  let service: AgentDiscoveryService;
  let preferences: AgentCliPreferencesService;
  let resolver: AgentDiscoveryResolver;

  beforeEach(() => {
    service = createMock<AgentDiscoveryService>();
    vi.mocked(service.discover).mockResolvedValue(SNAPSHOT);
    preferences = createMock<AgentCliPreferencesService>();
    vi.mocked(preferences.getDisabledBackends).mockResolvedValue(new Set());
    vi.mocked(preferences.getDisabledModels).mockResolvedValue(new Map());
    vi.mocked(preferences.getFavoriteModels).mockResolvedValue(new Map());
    resolver = new AgentDiscoveryResolver(service, preferences);
  });

  it('surfaces only available agents (cursor + opencode, not the unavailable claude), all enabled by default', async () => {
    const result = await resolver.discoverAgentClis(human);
    expect(service.discover).toHaveBeenCalledWith();
    expect(result.scannedAt).toBe('2026-06-19T00:00:00.000Z');
    expect(result.totalCount).toBe(2);
    expect(result.agents).toEqual([
      {
        attachesWorkspaceMcp: true,
        backend: 'cursor',
        chatCapable: true,
        enabled: true,
        label: 'Cursor Agent',
        modelOptions: [
          { enabled: true, favorite: false, model: 'auto' },
          { enabled: true, favorite: false, model: 'gpt-5.2' },
        ],
        models: ['auto', 'gpt-5.2'],
        supportsCustomBaseUrl: false,
        version: '2026.06.15',
      },
      {
        attachesWorkspaceMcp: true,
        backend: 'opencode',
        chatCapable: true,
        enabled: true,
        label: 'OpenCode',
        modelOptions: [
          { enabled: true, favorite: false, model: 'opencode/big-pickle' },
        ],
        models: ['opencode/big-pickle'],
        supportsCustomBaseUrl: true,
        version: '1.18.5',
      },
    ]);
  });

  it('overlays per-model disabled + favorite state into modelOptions, and an agent-OFF forces every model disabled', async () => {
    vi.mocked(preferences.getDisabledBackends).mockResolvedValue(
      new Set(['opencode']),
    );
    vi.mocked(preferences.getDisabledModels).mockResolvedValue(
      new Map([['cursor', new Set(['gpt-5.2'])]]),
    );
    vi.mocked(preferences.getFavoriteModels).mockResolvedValue(
      new Map([['cursor', new Set(['auto'])]]),
    );
    const result = await resolver.discoverAgentClis(human);
    const cursor = result.agents.find((agent) => agent.backend === 'cursor');
    const opencode = result.agents.find(
      (agent) => agent.backend === 'opencode',
    );
    expect(cursor?.modelOptions).toEqual([
      { enabled: true, favorite: true, model: 'auto' },
      { enabled: false, favorite: false, model: 'gpt-5.2' },
    ]);
    // opencode is agent-disabled → its model is forced disabled regardless of any
    // per-model state.
    expect(opencode?.enabled).toBe(false);
    expect(opencode?.modelOptions).toEqual([
      { enabled: false, favorite: false, model: 'opencode/big-pickle' },
    ]);
  });

  it("overlays the current user's disabled set onto enabled", async () => {
    vi.mocked(preferences.getDisabledBackends).mockResolvedValue(
      new Set(['cursor']),
    );
    const result = await resolver.discoverAgentClis(human);
    expect(preferences.getDisabledBackends).toHaveBeenCalledWith('user-1');
    expect(
      result.agents.map((agent) => [agent.backend, agent.enabled]),
    ).toEqual([
      ['cursor', false],
      ['opencode', true],
    ]);
  });

  it('defaults every agent to enabled for an unauthenticated request (no preference lookup)', async () => {
    const result = await resolver.discoverAgentClis(undefined);
    expect(preferences.getDisabledBackends).not.toHaveBeenCalled();
    expect(result.agents.every((agent) => agent.enabled)).toBe(true);
  });

  it('returns an empty payload when no agent CLIs are available', async () => {
    vi.mocked(service.discover).mockResolvedValue({
      agents: [
        {
          attachesWorkspaceMcp: true,
          available: false,
          backend: 'cursor',
          chatCapable: true,
          label: 'Cursor Agent',
          models: [],
          supportsCustomBaseUrl: false,
          version: null,
        },
      ],
      scannedAt: '2026-06-19T00:00:00.000Z',
    });
    const result = await resolver.discoverAgentClis(human);
    expect(result.totalCount).toBe(0);
    expect(result.agents).toEqual([]);
  });
});
