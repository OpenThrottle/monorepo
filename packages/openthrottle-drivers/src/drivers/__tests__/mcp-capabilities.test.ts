/**
 * @description Locks in that `attachesWorkspaceMcp` and `mcpAutoApprove` are INDEPENDENT axes.
 *
 * This is the bug this capability exists to prevent: `mcpAutoApprove: false` means only "emits no
 * MCP flags", and it is false for claude/opencode (which attach fine) as well as codex/grok (which
 * cannot attach at all). Any consumer that reads `mcpAutoApprove` to decide whether an MCP-dependent
 * prompt is viable warns on the wrong drivers. If someone ever "simplifies" these into one flag,
 * these assertions fail.
 */

import { describe, expect, it } from 'vitest';
import { ALL_DRIVERS, getDriver } from '../index.ts';

describe('MCP capability matrix', () => {
  it('records workspace-MCP reachability per driver', () => {
    const matrix = Object.fromEntries(
      ALL_DRIVERS.map((driver) => [
        driver.id,
        driver.capabilities.attachesWorkspaceMcp,
      ]),
    );

    expect(matrix).toEqual({
      claude: true,
      codex: false,
      cursor: true,
      grok: false,
      opencode: true,
    });
  });

  it('keeps attachesWorkspaceMcp independent of mcpAutoApprove', () => {
    // Attaches WITHOUT emitting flags — the case that makes mcpAutoApprove unusable as a proxy.
    for (const id of ['claude', 'opencode'] as const) {
      const { capabilities } = getDriver(id);
      expect(capabilities.mcpAutoApprove).toBe(false);
      expect(capabilities.attachesWorkspaceMcp).toBe(true);
    }

    // Emits no flags AND cannot attach — indistinguishable from the above via mcpAutoApprove alone.
    for (const id of ['codex', 'grok'] as const) {
      const { capabilities } = getDriver(id);
      expect(capabilities.mcpAutoApprove).toBe(false);
      expect(capabilities.attachesWorkspaceMcp).toBe(false);
    }

    // Attaches only BECAUSE it emits flags.
    const cursor = getDriver('cursor');
    expect(cursor.capabilities.mcpAutoApprove).toBe(true);
    expect(cursor.capabilities.attachesWorkspaceMcp).toBe(true);
  });

  it('proves the two flags disagree, so neither can substitute for the other', () => {
    const disagree = ALL_DRIVERS.filter(
      (d) =>
        d.capabilities.mcpAutoApprove !== d.capabilities.attachesWorkspaceMcp,
    ).map((d) => d.id);

    expect(disagree).toEqual(['claude', 'opencode']);
  });
});
