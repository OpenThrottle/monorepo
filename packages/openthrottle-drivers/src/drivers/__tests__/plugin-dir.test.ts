/**
 * @description Leg B of the child-repo hook overlay: the Claude driver's `--plugin-dir` emission.
 * Covers presence, absence when the caller resolves nothing (the fail-open path), flag ORDER
 * relative to `--model` and the worktree flags, escaping of paths with spaces and shell
 * metacharacters, and the fact that no other driver emits the flag.
 */

import { describe, expect, it } from 'vitest';

import {
  claudeDriver,
  codexDriver,
  cursorDriver,
  grokDriver,
  opencodeDriver,
} from '../index.ts';
import type { DriverInvocationConfig } from '../../types/index.ts';
import {
  appendPluginDirShellFlags,
  OPENTHROTTLE_PLUGIN_DIR_REL,
} from '../../utils/plugin-dir.ts';

const PROMPT = 'do the thing';
const BASE = `claude -p --permission-mode acceptEdits "${PROMPT}"`;
const PAYLOAD = '/srv/openthrottle/plugins/openthrottle';

const config = (
  extra: Omit<DriverInvocationConfig, 'iteration' | 'prompt'>,
): DriverInvocationConfig => ({ iteration: 1, prompt: PROMPT, ...extra });

describe('claude driver --plugin-dir', () => {
  it('emits the flag for a resolved payload directory', () => {
    expect(
      claudeDriver.buildShellCommand(config({ pluginDirs: [PAYLOAD] })),
    ).toBe(`${BASE} --plugin-dir ${PAYLOAD}`);
  });

  it('emits nothing when the caller resolved no payload (gated off or missing)', () => {
    expect(claudeDriver.buildShellCommand(config({}))).toBe(BASE);
    expect(claudeDriver.buildShellCommand(config({ pluginDirs: [] }))).toBe(
      BASE,
    );
  });

  it('ignores blank entries rather than emitting an empty flag', () => {
    expect(
      claudeDriver.buildShellCommand(config({ pluginDirs: ['', '   '] })),
    ).toBe(BASE);
  });

  it('quotes a payload path containing spaces', () => {
    expect(
      claudeDriver.buildShellCommand(
        config({
          pluginDirs: ['/Users/a b/OpenThrottle/plugins/openthrottle'],
        }),
      ),
    ).toBe(
      `${BASE} --plugin-dir "/Users/a b/OpenThrottle/plugins/openthrottle"`,
    );
  });

  it('neutralizes shell metacharacters in a payload path', () => {
    expect(
      claudeDriver.buildShellCommand(
        config({ pluginDirs: ['/tmp/$(id)/`whoami`;rm -rf ~'] }),
      ),
    ).toBe(`${BASE} --plugin-dir "/tmp/\\$(id)/\\\`whoami\\\`;rm -rf ~"`);
  });

  it('repeats the flag for multiple directories, in order', () => {
    expect(
      claudeDriver.buildShellCommand(
        config({ pluginDirs: [PAYLOAD, '/opt/other'] }),
      ),
    ).toBe(`${BASE} --plugin-dir ${PAYLOAD} --plugin-dir /opt/other`);
  });

  it('places the flag after --model and before the worktree flags', () => {
    expect(
      claudeDriver.buildShellCommand(
        config({
          model: 'sonnet',
          pluginDirs: [PAYLOAD],
          worktree: { worktree: 'wt' },
        }),
      ),
    ).toBe(`${BASE} --model sonnet --plugin-dir ${PAYLOAD} -w wt`);
  });

  it('never emits --bare, which would skip hooks and plugins outright', () => {
    expect(
      claudeDriver.buildShellCommand(config({ pluginDirs: [PAYLOAD] })),
    ).not.toContain('--bare');
  });

  it('does not drag in MCP flags alongside the plugin flag', () => {
    const command = claudeDriver.buildShellCommand(
      config({ pluginDirs: [PAYLOAD] }),
    );
    expect(command).not.toContain('--mcp-config');
    expect(command).not.toContain('--strict-mcp-config');
  });
});

describe('drivers without the pluginDir capability', () => {
  it.each([
    ['codex', codexDriver],
    ['cursor', cursorDriver],
    ['grok', grokDriver],
    ['opencode', opencodeDriver],
  ])('%s ignores pluginDirs entirely', (_id, driver) => {
    expect(driver.capabilities.pluginDir).toBe(false);
    expect(
      driver.buildShellCommand(config({ pluginDirs: [PAYLOAD] })),
    ).not.toContain('--plugin-dir');
  });
});

describe('appendPluginDirShellFlags', () => {
  it('is inert for a driver lacking the capability', () => {
    expect(
      appendPluginDirShellFlags('cmd', cursorDriver.capabilities, [PAYLOAD]),
    ).toBe('cmd');
  });

  it('is inert for undefined directories', () => {
    expect(
      appendPluginDirShellFlags('cmd', claudeDriver.capabilities, undefined),
    ).toBe('cmd');
  });

  it('exports the payload path the agentic-utils resolver joins against', () => {
    expect(OPENTHROTTLE_PLUGIN_DIR_REL).toBe('plugins/openthrottle');
  });
});
