import { describe, expect, it, vi } from 'vitest';

import type { AgentAccountResolverDeps } from '../resolve-agent-account.ts';
import { createAgentAccountResolver } from '../resolve-agent-account.ts';
import { AGENT_ACCOUNT_UNATTRIBUTED_REASONS } from '../types.ts';

const buildDeps = (
  overrides: Partial<AgentAccountResolverDeps>,
): AgentAccountResolverDeps => {
  return {
    now: () => 0,
    probeClaude: vi.fn().mockResolvedValue(null),
    readTextFile: vi.fn().mockResolvedValue(null),
    runStatus: vi.fn().mockResolvedValue(null),
    ttlMs: 1000,
    ...overrides,
  };
};

const env = { HOME: '/home/dev', PATH: '/usr/bin' };

describe('createAgentAccountResolver', () => {
  describe('codex', () => {
    it('reads auth.json under HOME/.codex by default', async () => {
      const readTextFile = vi
        .fn()
        .mockResolvedValue('{"tokens":{"account_id":"acct-1"}}');
      const resolver = createAgentAccountResolver(buildDeps({ readTextFile }));

      await expect(resolver.resolve('codex', { env })).resolves.toMatchObject({
        externalAccountId: 'acct-1',
        kind: 'identified',
      });
      expect(readTextFile).toHaveBeenCalledWith('/home/dev/.codex/auth.json');
    });

    it('honours CODEX_HOME', async () => {
      const readTextFile = vi.fn().mockResolvedValue(null);
      const resolver = createAgentAccountResolver(buildDeps({ readTextFile }));

      await resolver.resolve('codex', {
        env: { ...env, CODEX_HOME: '/custom/codex' },
      });

      expect(readTextFile).toHaveBeenCalledWith('/custom/codex/auth.json');
    });
  });

  describe('cursor', () => {
    it('runs `<cursor binary> status` and parses it', async () => {
      const runStatus = vi
        .fn()
        .mockResolvedValue('Logged in as dev@example.com\n');
      const resolver = createAgentAccountResolver(buildDeps({ runStatus }));

      await expect(
        resolver.resolve('cursor', {
          env: { ...env, OPENTHROTTLE_CURSOR_AGENT_BIN: '/stub/cursor-agent' },
        }),
      ).resolves.toMatchObject({ email: 'dev@example.com' });
      expect(runStatus).toHaveBeenCalledWith(
        '/stub/cursor-agent',
        ['status'],
        expect.objectContaining({ HOME: '/home/dev' }),
      );
    });
  });

  describe('antigravity', () => {
    it('reads the active Google account file', async () => {
      const readTextFile = vi
        .fn()
        .mockResolvedValue('{"active":"dev@example.com"}');
      const resolver = createAgentAccountResolver(buildDeps({ readTextFile }));

      await expect(
        resolver.resolve('antigravity', { env }),
      ).resolves.toMatchObject({ email: 'dev@example.com' });
      expect(readTextFile).toHaveBeenCalledWith(
        '/home/dev/.gemini/google_accounts.json',
      );
    });
  });

  describe('drivers with no account identity', () => {
    it.each(['grok', 'opencode', 'openai'])(
      '%s is unattributed as unsupported without probing',
      async (provider) => {
        const deps = buildDeps({});
        const resolver = createAgentAccountResolver(deps);

        await expect(resolver.resolve(provider, { env })).resolves.toEqual({
          kind: 'unattributed',
          provider,
          reason: AGENT_ACCOUNT_UNATTRIBUTED_REASONS.unsupported,
        });
        expect(deps.runStatus).not.toHaveBeenCalled();
        expect(deps.readTextFile).not.toHaveBeenCalled();
      },
    );
  });

  describe('an unknown provider', () => {
    it('is unattributed as unknown', async () => {
      const resolver = createAgentAccountResolver(buildDeps({}));

      await expect(resolver.resolve('mystery', { env })).resolves.toMatchObject(
        {
          reason: AGENT_ACCOUNT_UNATTRIBUTED_REASONS.unknownProvider,
        },
      );
    });
  });

  describe('when the IO throws', () => {
    it('resolves unattributed as a probe failure instead of rejecting', async () => {
      const resolver = createAgentAccountResolver(
        buildDeps({
          probeClaude: vi.fn().mockRejectedValue(new Error('boom')),
        }),
      );

      await expect(resolver.resolve('claude', { env })).resolves.toEqual({
        kind: 'unattributed',
        provider: 'claude',
        reason: AGENT_ACCOUNT_UNATTRIBUTED_REASONS.probeFailed,
      });
    });
  });

  describe('caching', () => {
    it('probes once per provider and env within the TTL', async () => {
      const probeClaude = vi.fn().mockResolvedValue(null);
      const resolver = createAgentAccountResolver(buildDeps({ probeClaude }));

      await Promise.all([
        resolver.resolve('claude', { env }),
        resolver.resolve('Claude', { env }),
      ]);

      expect(probeClaude).toHaveBeenCalledOnce();
    });

    it('probes again after the TTL', async () => {
      let clock = 0;
      const probeClaude = vi.fn().mockResolvedValue(null);
      const resolver = createAgentAccountResolver(
        buildDeps({ now: () => clock, probeClaude }),
      );

      await resolver.resolve('claude', { env });
      clock = 1001;
      await resolver.resolve('claude', { env });

      expect(probeClaude).toHaveBeenCalledTimes(2);
    });

    it('keys the cache on the config dir and API-key presence', async () => {
      const probeClaude = vi.fn().mockResolvedValue(null);
      const resolver = createAgentAccountResolver(buildDeps({ probeClaude }));

      await resolver.resolve('claude', { env });
      await resolver.resolve('claude', {
        env: { ...env, CLAUDE_CONFIG_DIR: '/home/dev/.claude-work' },
      });
      await resolver.resolve('claude', {
        env: { ...env, ANTHROPIC_API_KEY: 'sk-test' },
      });

      expect(probeClaude).toHaveBeenCalledTimes(3);
    });
  });
});
