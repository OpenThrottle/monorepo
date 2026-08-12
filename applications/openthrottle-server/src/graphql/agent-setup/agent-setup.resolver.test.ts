import { createMock } from '@golevelup/ts-vitest';
import type { ConfigService } from '@nestjs/config';
import {
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import { RolesService } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENT_CLI_INSTALL_ENABLED_ENV } from './agent-setup.config';
import { AgentSetupResolver } from './agent-setup.resolver';
import { AgentSetupService } from './agent-setup.service';

const human: AuthPrincipal = { kind: AUTH_PRINCIPAL_KIND_USER, sub: 'user-1' };

/** Build a resolver with a ConfigService whose flag is `enabled`, and a mocked setup service. */
function build(
  enabled: boolean,
  permissions: readonly string[] = [],
): {
  resolver: AgentSetupResolver;
  start: ReturnType<typeof vi.fn>;
} {
  const start = vi.fn().mockReturnValue('run-123');
  const config = createMock<ConfigService>({
    get: vi.fn((key: string) =>
      key === AGENT_CLI_INSTALL_ENABLED_ENV
        ? enabled
          ? 'true'
          : ''
        : undefined,
    ),
  });
  const roles = createMock<RolesService>({
    getPermissionsForUser: vi.fn().mockResolvedValue([...permissions]),
  });
  const setupService = createMock<AgentSetupService>({ start });
  return {
    resolver: new AgentSetupResolver(config, roles, setupService),
    start,
  };
}

describe('AgentSetupResolver', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves a disabled result and never spawns when the flag is off', () => {
    const { resolver, start } = build(false);
    const result = resolver.installAgentCli('claude');
    expect(result.disabled).toBe(true);
    expect(result.runId).toBeNull();
    expect(result.errorMessage).toMatch(/OT_AGENT_CLI_INSTALL_ENABLED/);
    expect(start).not.toHaveBeenCalled();
  });

  it('rejects an unknown backend without spawning', () => {
    const { resolver, start } = build(true);
    const result = resolver.installAgentCli('totally-not-a-cli');
    expect(result.disabled).toBe(false);
    expect(result.runId).toBeNull();
    expect(result.errorMessage).toMatch(/Unknown agent CLI backend/);
    expect(start).not.toHaveBeenCalled();
  });

  it('starts an install run and returns the runId when enabled + valid', () => {
    const { resolver, start } = build(true);
    const result = resolver.installAgentCli('claude');
    expect(result.disabled).toBe(false);
    expect(result.errorMessage).toBeNull();
    expect(result.runId).toBe('run-123');
    expect(result.mode).toBe('install');
    expect(start).toHaveBeenCalledWith({ backend: 'claude', mode: 'install' });
  });

  it('starts an update run with mode=update', () => {
    const { resolver, start } = build(true);
    const result = resolver.updateAgentCli('opencode');
    expect(result.runId).toBe('run-123');
    expect(result.mode).toBe('update');
    expect(start).toHaveBeenCalledWith({ backend: 'opencode', mode: 'update' });
  });

  it('reports config: installEnabled + canManage (has settings:write)', async () => {
    const { resolver } = build(true, [PERMISSIONS.SETTINGS_WRITE]);
    const config = await resolver.agentCliSetupConfig(human);
    expect(config).toEqual({ canManage: true, installEnabled: true });
  });

  it('reports canManage=false without settings:write, installEnabled=false when off', async () => {
    const { resolver } = build(false, [PERMISSIONS.SETTINGS_READ]);
    const config = await resolver.agentCliSetupConfig(human);
    expect(config).toEqual({ canManage: false, installEnabled: false });
  });

  it('reports canManage=false for an unauthenticated principal', async () => {
    const { resolver } = build(true);
    const config = await resolver.agentCliSetupConfig(undefined);
    expect(config).toEqual({ canManage: false, installEnabled: true });
  });
});
