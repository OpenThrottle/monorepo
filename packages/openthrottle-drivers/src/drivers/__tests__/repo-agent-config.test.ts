/**
 * @description The trust gate's driver half: an untrusted checkout's run spawns Claude with the
 * repo's own settings and MCP servers suppressed, a trusted run's command is unchanged, and every
 * driver that cannot suppress them is refused by the engine before anything spawns.
 */

import { describe, expect, it } from 'vitest';

import {
  checkRepoAgentConfig,
  runDriverAsync,
  runDriverSync,
} from '../../engine/index.ts';
import type {
  DriverInvocationConfig,
  DriverRepoAgentConfig,
  DriverRepoAgentConfigIsolated,
} from '../../types/index.ts';
import { escapeShellArg } from '../../utils/shell.ts';
import {
  antigravityDriver,
  claudeDriver,
  codexDriver,
  cursorDriver,
  grokDriver,
  opencodeDriver,
} from '../index.ts';

const PROMPT = 'do the thing';
const BASE = `claude -p --permission-mode acceptEdits "${PROMPT}" --output-format stream-json --verbose`;
const PAYLOAD = '/srv/openthrottle/plugins/openthrottle';
const OT_SERVERS = {
  'openthrottle-mcp': { args: ['mcp'], command: 'openthrottle' },
};

const config = (
  extra: Omit<DriverInvocationConfig, 'iteration' | 'prompt'>,
): DriverInvocationConfig => {
  return { iteration: 1, prompt: PROMPT, ...extra };
};

const isolated = (
  mcpServers: DriverRepoAgentConfigIsolated['mcpServers'],
): DriverRepoAgentConfig => {
  return { kind: 'isolated', mcpServers };
};

describe('claude driver repo agent config', () => {
  it('leaves a trusted command byte-identical', () => {
    expect(
      claudeDriver.buildShellCommand(
        config({ repoAgentConfig: { kind: 'trusted' } }),
      ),
    ).toBe(BASE);
    expect(claudeDriver.buildShellCommand(config({}))).toBe(BASE);
  });

  it('suppresses repo settings and MCP, passing OT servers inline', () => {
    const json = JSON.stringify({ mcpServers: OT_SERVERS });

    expect(
      claudeDriver.buildShellCommand(
        config({ repoAgentConfig: isolated(OT_SERVERS) }),
      ),
    ).toBe(
      `${BASE} --setting-sources user --strict-mcp-config --mcp-config ${escapeShellArg(json)}`,
    );
  });

  it('still emits strict MCP with no servers, so the repo .mcp.json never loads', () => {
    expect(
      claudeDriver.buildShellCommand(config({ repoAgentConfig: isolated({}) })),
    ).toBe(
      `${BASE} --setting-sources user --strict-mcp-config --mcp-config ${escapeShellArg('{"mcpServers":{}}')}`,
    );
  });

  it('places the flags after --plugin-dir and before the worktree flags', () => {
    const command = claudeDriver.buildShellCommand(
      config({
        pluginDirs: [PAYLOAD],
        repoAgentConfig: isolated({}),
        worktree: { worktree: 'plan-1' },
      }),
    );

    expect(command.indexOf('--plugin-dir')).toBeLessThan(
      command.indexOf('--setting-sources'),
    );
    expect(command.indexOf('--mcp-config')).toBeLessThan(
      command.indexOf(' -w '),
    );
  });

  it('shell-escapes substitution inside the server JSON', () => {
    const command = claudeDriver.buildShellCommand(
      config({
        repoAgentConfig: isolated({
          ot: { args: ['$(id)'], command: 'node' },
        }),
      }),
    );

    expect(command).toContain('\\$(id)');
  });
});

describe('checkRepoAgentConfig', () => {
  const incapable = [
    antigravityDriver,
    codexDriver,
    cursorDriver,
    grokDriver,
    opencodeDriver,
  ];

  it('allows a trusted or unspecified posture on every driver', () => {
    for (const driver of [claudeDriver, ...incapable]) {
      expect(checkRepoAgentConfig(driver, {})).toEqual({ ok: true });
      expect(
        checkRepoAgentConfig(driver, { repoAgentConfig: { kind: 'trusted' } }),
      ).toEqual({ ok: true });
    }
  });

  it('allows an isolated posture on claude', () => {
    expect(
      checkRepoAgentConfig(claudeDriver, { repoAgentConfig: isolated({}) }),
    ).toEqual({ ok: true });
  });

  it('refuses an isolated posture on every driver that cannot suppress repo config', () => {
    for (const driver of incapable) {
      const check = checkRepoAgentConfig(driver, {
        repoAgentConfig: isolated({}),
      });

      expect(check.ok).toBe(false);
    }
  });
});

describe('engine trust-gate refusal', () => {
  // A binary that cannot exist: were the engine to spawn, the output would be a spawn error, not the sentinel.
  const env = { OPENTHROTTLE_CURSOR_AGENT_BIN: '/nonexistent/cursor-agent' };

  it('returns the error sentinel without spawning (sync)', () => {
    const output = runDriverSync(
      cursorDriver,
      config({ env, repoAgentConfig: isolated({}) }),
    );

    expect(output.startsWith('<promise>ERROR</promise>\n')).toBe(true);
    expect(output).toContain('untrusted checkout');
  });

  it('resolves the error sentinel without spawning (async)', async () => {
    const output = await runDriverAsync(
      cursorDriver,
      config({ env, repoAgentConfig: isolated({}) }),
    );

    expect(output.startsWith('<promise>ERROR</promise>\n')).toBe(true);
    expect(output).toContain('untrusted checkout');
  });
});
