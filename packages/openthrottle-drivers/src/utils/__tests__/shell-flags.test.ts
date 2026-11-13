/**
 * @description Unit tests for `appendMcpShellFlags` — the capability gate that decides whether a
 * driver contributes MCP-attachment flags to its shell command. Covers both capability states, which
 * the per-driver parity tests cannot: only cursor advertises `mcpAutoApprove` today, so the `false`
 * branch has no driver exercising it end-to-end.
 */

import { describe, expect, it } from 'vitest';

import type {
  DriverCapabilities,
  DriverWorktreeOptions,
} from '../../types/index.ts';
import { WORKTREE_FLAG_ONLY } from '../shell.ts';
import {
  appendMcpShellFlags,
  appendWorktreeShellFlags,
} from '../shell-flags.ts';

const BASE = 'some-cli -p "prompt"';
const FLAGS = ['--approve-mcps', '--trust'] as const;

const mcpCapabilities = (mcpAutoApprove: boolean): DriverCapabilities => {
  return {
    attachesWorkspaceMcp: false,
    chatStreaming: false,
    mcpAutoApprove,
    permissionMode: false,
    pluginDir: false,
    reportsToolCalls: false,
    skipWorktreeSetup: false,
    supportsCustomBaseUrl: false,
    supportsModelFlag: false,
    worktree: false,
    worktreeBase: false,
  };
};

describe('appendMcpShellFlags', () => {
  it('appends the flags when the driver advertises mcpAutoApprove', () => {
    expect(appendMcpShellFlags(BASE, mcpCapabilities(true), FLAGS)).toBe(
      `${BASE} --approve-mcps --trust`,
    );
  });

  it('returns the command unchanged when the capability is false', () => {
    expect(appendMcpShellFlags(BASE, mcpCapabilities(false), FLAGS)).toBe(BASE);
  });

  it('returns the command unchanged when the driver supplies no flags', () => {
    expect(appendMcpShellFlags(BASE, mcpCapabilities(true), [])).toBe(BASE);
  });

  it('joins a single flag without a trailing separator', () => {
    expect(
      appendMcpShellFlags(BASE, mcpCapabilities(true), ['--approve-mcps']),
    ).toBe(`${BASE} --approve-mcps`);
  });
});

const BASE_CAPABILITIES: DriverCapabilities = {
  attachesWorkspaceMcp: false,
  chatStreaming: false,
  mcpAutoApprove: false,
  permissionMode: false,
  pluginDir: false,
  reportsToolCalls: false,
  skipWorktreeSetup: false,
  supportsCustomBaseUrl: false,
  supportsModelFlag: false,
  worktree: false,
  worktreeBase: false,
};

const NO_WORKTREE_BASE_COMMAND = 'run-cli --flag';

describe('appendWorktreeShellFlags', () => {
  it('returns the command unchanged when the driver has no worktree capability', () => {
    const worktree: DriverWorktreeOptions = { worktree: 'feature-a' };

    const result = appendWorktreeShellFlags(
      NO_WORKTREE_BASE_COMMAND,
      BASE_CAPABILITIES,
      worktree,
    );

    expect(result).toBe(NO_WORKTREE_BASE_COMMAND);
  });

  it('returns the command unchanged when no worktree option is provided', () => {
    const capabilities: DriverCapabilities = {
      ...BASE_CAPABILITIES,
      worktree: true,
    };

    const result = appendWorktreeShellFlags(
      NO_WORKTREE_BASE_COMMAND,
      capabilities,
      undefined,
    );

    expect(result).toBe(NO_WORKTREE_BASE_COMMAND);
  });

  it('appends -w with the escaped worktree name when capability is on', () => {
    const capabilities: DriverCapabilities = {
      ...BASE_CAPABILITIES,
      worktree: true,
    };
    const worktree: DriverWorktreeOptions = { worktree: 'feature-a' };

    const result = appendWorktreeShellFlags(
      NO_WORKTREE_BASE_COMMAND,
      capabilities,
      worktree,
    );

    expect(result).toBe('run-cli --flag -w feature-a');
  });

  it('emits bare -w with no name when worktree is WORKTREE_FLAG_ONLY', () => {
    const capabilities: DriverCapabilities = {
      ...BASE_CAPABILITIES,
      worktree: true,
    };
    const worktree: DriverWorktreeOptions = { worktree: WORKTREE_FLAG_ONLY };

    const result = appendWorktreeShellFlags(
      NO_WORKTREE_BASE_COMMAND,
      capabilities,
      worktree,
    );

    expect(result).toBe('run-cli --flag -w');
  });

  it('escapes an unsafe worktree name', () => {
    const capabilities: DriverCapabilities = {
      ...BASE_CAPABILITIES,
      worktree: true,
    };
    const worktree: DriverWorktreeOptions = { worktree: '$(id)' };

    const result = appendWorktreeShellFlags(
      NO_WORKTREE_BASE_COMMAND,
      capabilities,
      worktree,
    );

    expect(result).toBe('run-cli --flag -w "\\$(id)"');
  });

  it('ignores worktreeBase when the capability is off, even if provided', () => {
    const capabilities: DriverCapabilities = {
      ...BASE_CAPABILITIES,
      worktree: true,
      worktreeBase: false,
    };
    const worktree: DriverWorktreeOptions = {
      worktree: 'feature-a',
      worktreeBase: 'main',
    };

    const result = appendWorktreeShellFlags(
      NO_WORKTREE_BASE_COMMAND,
      capabilities,
      worktree,
    );

    expect(result).toBe('run-cli --flag -w feature-a');
  });

  it('appends --worktree-base when the capability is on and a base is provided', () => {
    const capabilities: DriverCapabilities = {
      ...BASE_CAPABILITIES,
      worktree: true,
      worktreeBase: true,
    };
    const worktree: DriverWorktreeOptions = {
      worktree: 'feature-a',
      worktreeBase: 'main',
    };

    const result = appendWorktreeShellFlags(
      NO_WORKTREE_BASE_COMMAND,
      capabilities,
      worktree,
    );

    expect(result).toBe('run-cli --flag -w feature-a --worktree-base main');
  });

  it('omits --worktree-base when worktreeBase is capability-enabled but blank/whitespace', () => {
    const capabilities: DriverCapabilities = {
      ...BASE_CAPABILITIES,
      worktree: true,
      worktreeBase: true,
    };
    const worktree: DriverWorktreeOptions = {
      worktree: 'feature-a',
      worktreeBase: '   ',
    };

    const result = appendWorktreeShellFlags(
      NO_WORKTREE_BASE_COMMAND,
      capabilities,
      worktree,
    );

    expect(result).toBe('run-cli --flag -w feature-a');
  });

  it('appends --skip-worktree-setup only when both capability and option are true', () => {
    const capabilities: DriverCapabilities = {
      ...BASE_CAPABILITIES,
      skipWorktreeSetup: true,
      worktree: true,
    };
    const worktree: DriverWorktreeOptions = {
      skipWorktreeSetup: true,
      worktree: 'feature-a',
    };

    const result = appendWorktreeShellFlags(
      NO_WORKTREE_BASE_COMMAND,
      capabilities,
      worktree,
    );

    expect(result).toBe('run-cli --flag -w feature-a --skip-worktree-setup');
  });

  it('omits --skip-worktree-setup when the option is true but the capability is off', () => {
    const capabilities: DriverCapabilities = {
      ...BASE_CAPABILITIES,
      skipWorktreeSetup: false,
      worktree: true,
    };
    const worktree: DriverWorktreeOptions = {
      skipWorktreeSetup: true,
      worktree: 'feature-a',
    };

    const result = appendWorktreeShellFlags(
      NO_WORKTREE_BASE_COMMAND,
      capabilities,
      worktree,
    );

    expect(result).toBe('run-cli --flag -w feature-a');
  });

  it('combines worktree name, worktree base, and skip-worktree-setup when all capabilities are on', () => {
    const capabilities: DriverCapabilities = {
      ...BASE_CAPABILITIES,
      skipWorktreeSetup: true,
      worktree: true,
      worktreeBase: true,
    };
    const worktree: DriverWorktreeOptions = {
      skipWorktreeSetup: true,
      worktree: 'feature-a',
      worktreeBase: 'develop',
    };

    const result = appendWorktreeShellFlags(
      NO_WORKTREE_BASE_COMMAND,
      capabilities,
      worktree,
    );

    expect(result).toBe(
      'run-cli --flag -w feature-a --worktree-base develop --skip-worktree-setup',
    );
  });
});
