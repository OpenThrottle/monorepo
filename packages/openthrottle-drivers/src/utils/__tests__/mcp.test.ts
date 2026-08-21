/**
 * @description Unit tests for `appendMcpShellFlags` — the capability gate that decides whether a
 * driver contributes MCP-attachment flags to its shell command. Covers both capability states, which
 * the per-driver parity tests cannot: only cursor advertises `mcpAutoApprove` today, so the `false`
 * branch has no driver exercising it end-to-end.
 */

import { describe, expect, it } from 'vitest';
import type { DriverCapabilities } from '../../types/index.ts';
import { appendMcpShellFlags } from '../mcp.ts';

const BASE = 'some-cli -p "prompt"';
const FLAGS = ['--approve-mcps', '--trust'] as const;

const capabilities = (mcpAutoApprove: boolean): DriverCapabilities => ({
  chatStreaming: false,
  mcpAutoApprove,
  permissionMode: false,
  pluginDir: false,
  skipWorktreeSetup: false,
  supportsCustomBaseUrl: false,
  supportsModelFlag: false,
  worktree: false,
  worktreeBase: false,
});

describe('appendMcpShellFlags', () => {
  it('appends the flags when the driver advertises mcpAutoApprove', () => {
    expect(appendMcpShellFlags(BASE, capabilities(true), FLAGS)).toBe(
      `${BASE} --approve-mcps --trust`,
    );
  });

  it('returns the command unchanged when the capability is false', () => {
    expect(appendMcpShellFlags(BASE, capabilities(false), FLAGS)).toBe(BASE);
  });

  it('returns the command unchanged when the driver supplies no flags', () => {
    expect(appendMcpShellFlags(BASE, capabilities(true), [])).toBe(BASE);
  });

  it('joins a single flag without a trailing separator', () => {
    expect(
      appendMcpShellFlags(BASE, capabilities(true), ['--approve-mcps']),
    ).toBe(`${BASE} --approve-mcps`);
  });
});
