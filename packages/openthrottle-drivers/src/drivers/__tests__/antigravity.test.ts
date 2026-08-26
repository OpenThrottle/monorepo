/**
 * @description Command-construction tests for the Antigravity driver
 * (`agy -p --dangerously-skip-permissions "<prompt>" … < /dev/null`), including prompt/model
 * escaping, the stdin redirect, the tolerant `agy models` parser, and confirmation that it
 * advertises no worktree/MCP/plugin capability and no chat streaming yet. Flag facts come from the
 * 1.1.21 dossier (docs/openthrottle/antigravity-stream-json-schema.md).
 */

import { describe, expect, it } from 'vitest';
import type { DriverInvocationConfig } from '../../types/index.ts';
import { antigravityDriver } from '../antigravity.ts';
import { getDriver } from '../index.ts';

const BASE =
  'agy -p "do the thing" --dangerously-skip-permissions --add-dir "$PWD"';
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

describe('antigravity driver', () => {
  it('builds the base one-shot command with -p, skip-permissions, and --add-dir', () => {
    expect(antigravityDriver.buildShellCommand(config())).toBe(
      `${BASE}${STDIN}`,
    );
  });

  it('redirects stdin from /dev/null so an unauthenticated run cannot wait on a pasted OAuth code', () => {
    expect(antigravityDriver.buildShellCommand(config())).toMatch(
      / < \/dev\/null$/,
    );
  });

  it('emits -p (unlike gemini, --print/--prompt is not deprecated here)', () => {
    expect(antigravityDriver.buildShellCommand(config())).toMatch(/ -p\b/);
  });

  it('puts the prompt immediately after -p, which takes it as its VALUE', () => {
    // Regression: a flag between `-p` and the prompt makes the CLI consume the flag as the
    // prompt and exit 2 (verified against 1.1.21).
    expect(antigravityDriver.buildShellCommand(config())).toMatch(
      /^agy -p "do the thing" /,
    );
  });

  it('emits --add-dir "$PWD" so the run operates on its cwd, not a scratch project', () => {
    // Regression: without --add-dir the CLI reports no active workspace and writes into
    // ~/.gemini/antigravity-cli/scratch/<name>/ instead of the run's cwd. A relative `.` is
    // not honored, so this must stay the shell-expanded absolute $PWD.
    expect(antigravityDriver.buildShellCommand(config())).toContain(
      '--add-dir "$PWD"',
    );
  });

  it('never emits --approval-mode (that is the gemini flag, not an antigravity one)', () => {
    expect(antigravityDriver.buildShellCommand(config())).not.toContain(
      '--approval-mode',
    );
  });

  it('leaves --output-format at the default (the streaming path builds its own argv)', () => {
    expect(antigravityDriver.buildShellCommand(config())).not.toContain(
      '--output-format',
    );
  });

  it('appends --model for a plain model', () => {
    expect(
      antigravityDriver.buildShellCommand(config({ model: 'gemini-3-pro' })),
    ).toBe(`${BASE} --model gemini-3-pro${STDIN}`);
  });

  it('omits --model when unset or auto', () => {
    expect(antigravityDriver.buildShellCommand(config({ model: 'auto' }))).toBe(
      `${BASE}${STDIN}`,
    );
    expect(antigravityDriver.buildShellCommand(config({ model: '  ' }))).toBe(
      `${BASE}${STDIN}`,
    );
  });

  it('neutralizes shell metacharacters in the prompt', () => {
    expect(
      antigravityDriver.buildShellCommand(
        config({ prompt: 'leak ${HOME} $(id)' }),
      ),
    ).toBe(
      'agy -p "leak \\${HOME} \\$(id)" --dangerously-skip-permissions --add-dir "$PWD" < /dev/null',
    );
  });

  it('escapes a malicious model value', () => {
    expect(
      antigravityDriver.buildShellCommand(config({ model: 'x; rm -rf ~' })),
    ).toBe(`${BASE} --model "x; rm -rf ~"${STDIN}`);
  });

  it('ignores worktree options (no worktree capability)', () => {
    expect(
      antigravityDriver.buildShellCommand(
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
      antigravityDriver.buildShellCommand(
        config({
          endpoint: {
            baseUrl: 'http://localhost:11434/v1',
            provider: 'ollama',
          },
        }),
      ),
    ).toBe(`${BASE}${STDIN}`);
  });

  it('emits no MCP flags (antigravity reads its own ~/.gemini/config/mcp_config.json)', () => {
    const command = antigravityDriver.buildShellCommand(config());
    expect(command).not.toContain('--approve-mcps');
    expect(command).not.toContain('--allowed-mcp-server-names');
  });

  describe('model listing', () => {
    it('lists models via the `models` subcommand', () => {
      expect(antigravityDriver.discoverModels).toMatchObject({
        argv: ['models'],
        mode: 'command',
      });
    });

    it('parses the real tab-separated listing and drops the progress line', () => {
      const listing = antigravityDriver.discoverModels;

      if (listing?.mode !== 'command') {
        throw new Error('expected a command-mode listing');
      }

      // Verbatim shape of authenticated `agy models` output (1.1.21).
      const stdout = [
        'Fetching available models...',
        'gemini-3.1-pro-high\tGemini 3.1 Pro (High)',
        'claude-sonnet-4-6\tClaude Sonnet 4.6 (Thinking)',
        'gpt-oss-120b-medium\tGPT-OSS 120B (Medium)',
        '',
      ].join('\n');

      expect(listing.parse(stdout)).toEqual([
        'gemini-3.1-pro-high',
        'claude-sonnet-4-6',
        'gpt-oss-120b-medium',
      ]);
    });

    it('drops a display name that is not preceded by a tab', () => {
      const listing = antigravityDriver.discoverModels;

      if (listing?.mode !== 'command') {
        throw new Error('expected a command-mode listing');
      }

      expect(listing.parse('Gemini 3.1 Pro (High)\n')).toEqual([]);
    });

    it('returns [] for the unauthenticated sign-in error rather than guessing', () => {
      const listing = antigravityDriver.discoverModels;

      if (listing?.mode !== 'command') {
        throw new Error('expected a command-mode listing');
      }

      expect(
        listing.parse(
          'Fetching available models...\nError: Please sign in to view available models. Launch the CLI without arguments to sign in.\n',
        ),
      ).toEqual([]);
    });
  });

  it('installs via the official curl-shell installer and updates via its own subcommand', () => {
    expect(antigravityDriver.install).toEqual({
      installerShell: 'bash',
      method: 'curl-shell',
      url: 'https://antigravity.google/cli/install.sh',
    });
    expect(antigravityDriver.update).toEqual({
      argv: ['update'],
      method: 'command',
    });
  });

  it('advertises id, label, and capabilities', () => {
    expect(antigravityDriver.id).toBe('antigravity');
    expect(antigravityDriver.label).toBe('antigravity');
    expect(antigravityDriver.binary).toBe('agy');
    expect(antigravityDriver.binEnv).toBe('OPENTHROTTLE_ANTIGRAVITY_BIN');
    expect(antigravityDriver.capabilities).toEqual({
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
    expect(getDriver('antigravity')).toBe(antigravityDriver);
  });
});
