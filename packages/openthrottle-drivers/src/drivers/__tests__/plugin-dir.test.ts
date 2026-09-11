/**
 * @description Leg B of the child-repo hook overlay: `--plugin-dir` emission. Covers presence,
 * absence when the caller resolves nothing (the fail-open path), flag ORDER relative to `--model`
 * and the worktree flags, escaping of paths with spaces and shell metacharacters, and which
 * drivers emit the flag at all.
 *
 * Claude and Cursor both emit it and each names its OWN payload via `pluginDirRel` — a payload's
 * hook config names one tool's events, so pointing a CLI at the other's payload loads cleanly and
 * records nothing.
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
  OPENTHROTTLE_CURSOR_PLUGIN_DIR_REL,
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

const CURSOR_BASE = `cursor-agent --force -p "${PROMPT}" --approve-mcps --trust`;
const CURSOR_PAYLOAD = '/srv/openthrottle/plugins/openthrottle-cursor';

describe('cursor driver --plugin-dir', () => {
  it('advertises the capability', () => {
    expect(cursorDriver.capabilities.pluginDir).toBe(true);
  });

  it('emits the flag for a resolved payload directory', () => {
    expect(
      cursorDriver.buildShellCommand(config({ pluginDirs: [CURSOR_PAYLOAD] })),
    ).toBe(`${CURSOR_BASE} --plugin-dir ${CURSOR_PAYLOAD}`);
  });

  it('emits nothing when the caller resolved no payload', () => {
    expect(cursorDriver.buildShellCommand(config({}))).toBe(CURSOR_BASE);
    expect(cursorDriver.buildShellCommand(config({ pluginDirs: [] }))).toBe(
      CURSOR_BASE,
    );
  });

  it('quotes a payload path containing spaces', () => {
    expect(
      cursorDriver.buildShellCommand(
        config({ pluginDirs: ['/Users/a b/plugins/openthrottle-cursor'] }),
      ),
    ).toBe(
      `${CURSOR_BASE} --plugin-dir "/Users/a b/plugins/openthrottle-cursor"`,
    );
  });

  it('places the flag after the MCP flags and before the worktree flags', () => {
    expect(
      cursorDriver.buildShellCommand(
        config({
          model: 'sonnet-4.5',
          pluginDirs: [CURSOR_PAYLOAD],
          worktree: { worktree: 'wt' },
        }),
      ),
    ).toBe(
      `cursor-agent --force -p "${PROMPT}" --model sonnet-4.5 --approve-mcps --trust --plugin-dir ${CURSOR_PAYLOAD} -w wt`,
    );
  });
});

describe('per-driver payload paths', () => {
  it('points each plugin-capable driver at its own payload', () => {
    expect(claudeDriver.pluginDirRel).toBe(OPENTHROTTLE_PLUGIN_DIR_REL);
    expect(cursorDriver.pluginDirRel).toBe(OPENTHROTTLE_CURSOR_PLUGIN_DIR_REL);
    expect(claudeDriver.pluginDirRel).not.toBe(cursorDriver.pluginDirRel);
  });

  it('exports the payload paths the agentic-utils resolver joins against', () => {
    expect(OPENTHROTTLE_PLUGIN_DIR_REL).toBe('plugins/openthrottle');
    expect(OPENTHROTTLE_CURSOR_PLUGIN_DIR_REL).toBe(
      'plugins/openthrottle-cursor',
    );
  });
});

describe('drivers without the pluginDir capability', () => {
  it.each([
    ['codex', codexDriver],
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
      appendPluginDirShellFlags('cmd', codexDriver.capabilities, [PAYLOAD]),
    ).toBe('cmd');
  });

  it('is inert for undefined directories', () => {
    expect(
      appendPluginDirShellFlags('cmd', claudeDriver.capabilities, undefined),
    ).toBe('cmd');
  });
});
