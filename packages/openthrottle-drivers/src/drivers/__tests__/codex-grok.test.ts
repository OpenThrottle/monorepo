/**
 * @description Command-construction tests for the codex (`codex exec`) and grok (`grok -p`) drivers,
 * including model/prompt escaping, grok's permission-mode + `-w` worktree support, and codex's
 * lack of worktree flags. Verified flag shapes come from the installed CLIs' `--help`.
 */

import { describe, expect, it } from 'vitest';
import type { DriverInvocationConfig } from '../../types/index.ts';
import { codexDriver, getDriver, grokDriver } from '../index.ts';

const config = (
  extra: Omit<DriverInvocationConfig, 'iteration' | 'prompt'> & {
    prompt?: string;
  } = {},
): DriverInvocationConfig => ({
  iteration: 1,
  prompt: extra.prompt ?? 'fix it',
  ...extra,
});

describe('codex driver', () => {
  it('builds the base exec command with a workspace-write sandbox', () => {
    expect(codexDriver.buildShellCommand(config())).toBe(
      'codex exec --sandbox workspace-write "fix it"',
    );
  });

  it('places --model before the positional prompt', () => {
    expect(codexDriver.buildShellCommand(config({ model: 'o3' }))).toBe(
      'codex exec --sandbox workspace-write --model o3 "fix it"',
    );
  });

  it('omits --model when unset or auto', () => {
    expect(codexDriver.buildShellCommand(config({ model: 'auto' }))).toBe(
      'codex exec --sandbox workspace-write "fix it"',
    );
  });

  it('neutralizes prompt metacharacters and escapes a malicious model', () => {
    expect(
      codexDriver.buildShellCommand(
        config({ model: 'm; rm -rf ~', prompt: 'run $(id)' }),
      ),
    ).toBe(
      'codex exec --sandbox workspace-write --model "m; rm -rf ~" "run \\$(id)"',
    );
  });

  it('ignores worktree options (no worktree capability)', () => {
    expect(
      codexDriver.buildShellCommand(config({ worktree: { worktree: 'wt' } })),
    ).toBe('codex exec --sandbox workspace-write "fix it"');
  });

  it('targets a fingerprinted local endpoint via --oss + base_url override', () => {
    expect(
      codexDriver.buildShellCommand(
        config({
          endpoint: {
            baseUrl: 'http://localhost:11434/v1',
            provider: 'ollama',
          },
          model: 'llama3',
        }),
      ),
    ).toBe(
      'codex exec --sandbox workspace-write --oss --local-provider ollama -c "model_providers.oss.base_url=\\"http://localhost:11434/v1\\"" --model llama3 "fix it"',
    );
  });

  it('defaults an unfingerprinted endpoint provider to ollama', () => {
    expect(
      codexDriver.buildShellCommand(
        config({ endpoint: { baseUrl: 'http://h:1/v1', provider: null } }),
      ),
    ).toBe(
      'codex exec --sandbox workspace-write --oss --local-provider ollama -c "model_providers.oss.base_url=\\"http://h:1/v1\\"" "fix it"',
    );
  });

  it('targets a REMOTE gateway via its own model_providers table, not --oss', () => {
    const command = codexDriver.buildShellCommand(
      config({
        endpoint: {
          apiKey: 'sk-or-v1-test',
          baseUrl: 'https://openrouter.ai/api/v1',
          kind: 'remote',
          provider: 'openrouter',
        },
        model: 'anthropic/claude-sonnet-5',
      }),
    );

    // Each override is shell-quoted because the TOML value itself carries the
    // double quotes codex needs to parse it as a string literal.
    expect(command).toBe(
      'OPENTHROTTLE_REMOTE_API_KEY=sk-or-v1-test codex exec --sandbox workspace-write' +
        ' -c "model_provider=\\"openthrottle_remote\\""' +
        ' -c "model_providers.openthrottle_remote.name=\\"openrouter\\""' +
        ' -c "model_providers.openthrottle_remote.base_url=\\"https://openrouter.ai/api/v1\\""' +
        ' -c "model_providers.openthrottle_remote.env_key=\\"OPENTHROTTLE_REMOTE_API_KEY\\""' +
        ' -c "model_providers.openthrottle_remote.wire_api=\\"responses\\""' +
        ' --model anthropic/claude-sonnet-5 "fix it"',
    );
  });

  it('never uses --oss for a remote endpoint (its wire adapter is ollama/lmstudio)', () => {
    const command = codexDriver.buildShellCommand(
      config({
        endpoint: {
          apiKey: 'sk-or-v1-test',
          baseUrl: 'https://openrouter.ai/api/v1',
          kind: 'remote',
          provider: 'openrouter',
        },
      }),
    );

    expect(command).not.toContain('--oss');
    expect(command).not.toContain('--local-provider');
    expect(command).not.toContain('model_providers.oss');
  });

  it('pins wire_api to responses (codex 0.145.0 rejects "chat" at config load)', () => {
    const command = codexDriver.buildShellCommand(
      config({
        endpoint: {
          apiKey: 'k',
          baseUrl: 'https://openrouter.ai/api/v1',
          kind: 'remote',
        },
      }),
    );

    expect(command).toContain('wire_api=\\"responses\\"');
    expect(command).not.toContain('wire_api=\\"chat\\"');
  });

  it('carries the key as an env assignment, not a codex argv token', () => {
    const command = codexDriver.buildShellCommand(
      config({
        endpoint: {
          apiKey: 'sk-or-v1-secret',
          baseUrl: 'https://openrouter.ai/api/v1',
          kind: 'remote',
        },
      }),
    );

    // Exactly once, in the leading env assignment. A `-c` override carrying the
    // literal key would bake it into codex's own argv and into the generated
    // provider config it may persist.
    expect(
      command.startsWith('OPENTHROTTLE_REMOTE_API_KEY=sk-or-v1-secret '),
    ).toBe(true);
    expect(command.indexOf('sk-or-v1-secret')).toBe(
      command.lastIndexOf('sk-or-v1-secret'),
    );
  });

  it('escapes a hostile remote baseUrl and key rather than interpolating them', () => {
    const command = codexDriver.buildShellCommand(
      config({
        endpoint: {
          apiKey: 'k$(id)',
          baseUrl: 'https://evil/v1"; rm -rf ~; echo "',
          kind: 'remote',
        },
      }),
    );

    expect(command).not.toMatch(/[^\\]\$\(id\)/);
    expect(command).toContain('rm -rf');
    expect(command).not.toMatch(/[^\\]"; rm -rf ~; echo/);
  });

  it('omits the env prefix when a remote endpoint carries no key', () => {
    const command = codexDriver.buildShellCommand(
      config({
        endpoint: { baseUrl: 'https://openrouter.ai/api/v1', kind: 'remote' },
      }),
    );

    expect(command.startsWith('codex exec')).toBe(true);
  });

  it('emits no MCP flags (codex reads ~/.codex/config.toml, not the workspace)', () => {
    const command = codexDriver.buildShellCommand(config());
    expect(command).not.toContain('--approve-mcps');
    expect(command).not.toContain('mcp_servers');
  });

  it('advertises id, label, and capabilities', () => {
    expect(codexDriver.id).toBe('codex');
    expect(codexDriver.label).toBe('codex');
    expect(codexDriver.capabilities).toEqual({
      attachesWorkspaceMcp: false,
      chatStreaming: true,
      mcpAutoApprove: false,
      permissionMode: true,
      pluginDir: false,
      skipWorktreeSetup: false,
      supportsCustomBaseUrl: true,
      supportsModelFlag: true,
      worktree: false,
      worktreeBase: false,
    });
  });

  it('is resolvable from the registry', () => {
    expect(getDriver('codex')).toBe(codexDriver);
  });
});

describe('grok driver', () => {
  it('builds the single-turn command with acceptEdits', () => {
    expect(grokDriver.buildShellCommand(config())).toBe(
      'grok -p "fix it" --permission-mode acceptEdits',
    );
  });

  it('appends --model when set (omits for auto)', () => {
    expect(grokDriver.buildShellCommand(config({ model: 'grok-4' }))).toBe(
      'grok -p "fix it" --permission-mode acceptEdits --model grok-4',
    );
    expect(grokDriver.buildShellCommand(config({ model: 'auto' }))).toBe(
      'grok -p "fix it" --permission-mode acceptEdits',
    );
  });

  it('appends -w for a named worktree', () => {
    expect(
      grokDriver.buildShellCommand(config({ worktree: { worktree: 'wt' } })),
    ).toBe('grok -p "fix it" --permission-mode acceptEdits -w wt');
  });

  it('appends bare -w for the flag-only worktree sentinel', () => {
    expect(
      grokDriver.buildShellCommand(config({ worktree: { worktree: '' } })),
    ).toBe('grok -p "fix it" --permission-mode acceptEdits -w');
  });

  it('does not emit --worktree-base (capability off; grok uses --worktree-ref)', () => {
    const command = grokDriver.buildShellCommand(
      config({ worktree: { worktree: 'wt', worktreeBase: 'main' } }),
    );
    expect(command).toBe(
      'grok -p "fix it" --permission-mode acceptEdits -w wt',
    );
    expect(command).not.toContain('--worktree-base');
  });

  it('neutralizes prompt metacharacters', () => {
    expect(
      grokDriver.buildShellCommand(config({ prompt: 'leak ${HOME}' })),
    ).toBe('grok -p "leak \\${HOME}" --permission-mode acceptEdits');
  });

  it('redirects at a local endpoint via GROK_MODELS_BASE_URL + XAI_API_KEY env', () => {
    expect(
      grokDriver.buildShellCommand(
        config({
          endpoint: { baseUrl: 'http://localhost:11434/v1' },
          model: 'llama3',
        }),
      ),
    ).toBe(
      'GROK_MODELS_BASE_URL="http://localhost:11434/v1" XAI_API_KEY=local grok -p "fix it" --permission-mode acceptEdits --model llama3',
    );
  });

  it('honors a supplied apiKey and composes with a worktree', () => {
    expect(
      grokDriver.buildShellCommand(
        config({
          endpoint: { apiKey: 'sk-x', baseUrl: 'http://h:1/v1' },
          worktree: { worktree: 'wt' },
        }),
      ),
    ).toBe(
      'GROK_MODELS_BASE_URL="http://h:1/v1" XAI_API_KEY=sk-x grok -p "fix it" --permission-mode acceptEdits -w wt',
    );
  });

  it('emits no MCP flags (grok reads its own TOML config, not the workspace)', () => {
    const command = grokDriver.buildShellCommand(config());
    expect(command).not.toContain('--approve-mcps');
    expect(command).not.toContain('--mcp');
  });

  it('advertises id, label, and capabilities', () => {
    expect(grokDriver.id).toBe('grok');
    expect(grokDriver.label).toBe('grok');
    expect(grokDriver.capabilities).toEqual({
      attachesWorkspaceMcp: true,
      chatStreaming: true,
      mcpAutoApprove: false,
      permissionMode: true,
      pluginDir: false,
      skipWorktreeSetup: false,
      supportsCustomBaseUrl: true,
      supportsModelFlag: true,
      worktree: true,
      worktreeBase: false,
    });
  });

  it('is resolvable from the registry', () => {
    expect(getDriver('grok')).toBe(grokDriver);
  });
});
