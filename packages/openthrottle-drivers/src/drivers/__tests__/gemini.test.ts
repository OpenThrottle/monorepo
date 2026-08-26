/**
 * @description Command-construction tests for the Gemini driver
 * (`gemini --approval-mode yolo "<prompt>" … < /dev/null`), including prompt/model escaping, the
 * load-bearing stdin redirect, and confirmation that it advertises no worktree/MCP/plugin
 * capability. Flag facts come from the 0.25.2 dossier
 * (docs/openthrottle/gemini-stream-json-schema.md).
 */

import { describe, expect, it } from 'vitest';
import type { DriverInvocationConfig } from '../../types/index.ts';
import { geminiDriver } from '../gemini.ts';
import { getDriver } from '../index.ts';

const BASE = 'gemini --approval-mode yolo "do the thing"';
const STDIN = ' < /dev/null';

const config = (
  extra: Omit<DriverInvocationConfig, 'iteration' | 'prompt'> & {
    prompt?: string;
  } = {},
): DriverInvocationConfig => ({
  iteration: 1,
  prompt: extra.prompt ?? 'do the thing',
  ...extra,
});

describe('gemini driver', () => {
  it('builds the base one-shot command with --approval-mode yolo', () => {
    expect(geminiDriver.buildShellCommand(config())).toBe(`${BASE}${STDIN}`);
  });

  it('redirects stdin from /dev/null (non-TTY stdin blocks the CLI otherwise)', () => {
    expect(geminiDriver.buildShellCommand(config())).toMatch(/ < \/dev\/null$/);
  });

  it('never emits the deprecated -p flag (positional prompt only)', () => {
    expect(geminiDriver.buildShellCommand(config())).not.toMatch(/ -p\b/);
  });

  it('appends --model for a plain model', () => {
    expect(
      geminiDriver.buildShellCommand(config({ model: 'gemini-2.5-pro' })),
    ).toBe(`${BASE} --model gemini-2.5-pro${STDIN}`);
  });

  it('omits --model when unset or auto', () => {
    expect(geminiDriver.buildShellCommand(config({ model: 'auto' }))).toBe(
      `${BASE}${STDIN}`,
    );
    expect(geminiDriver.buildShellCommand(config({ model: '  ' }))).toBe(
      `${BASE}${STDIN}`,
    );
  });

  it('neutralizes shell metacharacters in the prompt', () => {
    expect(
      geminiDriver.buildShellCommand(config({ prompt: 'leak ${HOME} $(id)' })),
    ).toBe('gemini --approval-mode yolo "leak \\${HOME} \\$(id)" < /dev/null');
  });

  it('escapes a malicious model value', () => {
    expect(
      geminiDriver.buildShellCommand(config({ model: 'x; rm -rf ~' })),
    ).toBe(`${BASE} --model "x; rm -rf ~"${STDIN}`);
  });

  it('ignores worktree options (no worktree capability)', () => {
    expect(
      geminiDriver.buildShellCommand(
        config({
          worktree: {
            skipWorktreeSetup: true,
            worktree: 'wt',
            worktreeBase: 'main',
          },
        }),
      ),
    ).toBe(`${BASE}${STDIN}`);
  });

  it('ignores a local endpoint (supportsCustomBaseUrl is false)', () => {
    expect(
      geminiDriver.buildShellCommand(
        config({
          endpoint: {
            baseUrl: 'http://localhost:11434/v1',
            provider: 'ollama',
          },
        }),
      ),
    ).toBe(`${BASE}${STDIN}`);
  });

  it('emits no MCP flags (gemini reads .gemini/settings.json on its own host)', () => {
    const command = geminiDriver.buildShellCommand(config());
    expect(command).not.toContain('--approve-mcps');
    expect(command).not.toContain('--allowed-mcp-server-names');
  });

  it('has no model-listing descriptor (availability-only discovery)', () => {
    expect(geminiDriver.discoverModels).toBeUndefined();
  });

  it('installs via npm (no official curl-shell installer) and updates by reinstall', () => {
    expect(geminiDriver.install).toEqual({
      method: 'npm',
      packageName: '@google/gemini-cli',
    });
    expect(geminiDriver.update).toEqual({ method: 'reinstall' });
  });

  it('advertises id, label, and capabilities', () => {
    expect(geminiDriver.id).toBe('gemini');
    expect(geminiDriver.label).toBe('gemini');
    expect(geminiDriver.binEnv).toBe('OPENTHROTTLE_GEMINI_BIN');
    expect(geminiDriver.capabilities).toEqual({
      attachesWorkspaceMcp: false,
      chatStreaming: true,
      mcpAutoApprove: false,
      permissionMode: true,
      pluginDir: false,
      skipWorktreeSetup: false,
      supportsCustomBaseUrl: false,
      supportsModelFlag: true,
      worktree: false,
      worktreeBase: false,
    });
  });

  it('is resolvable from the registry', () => {
    expect(getDriver('gemini')).toBe(geminiDriver);
  });
});
