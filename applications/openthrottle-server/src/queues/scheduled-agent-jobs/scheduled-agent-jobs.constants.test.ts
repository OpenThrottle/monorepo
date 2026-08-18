/**
 * @description Tests for `resolveScheduledAgentJobCwd`. The default matters more than it looks: the
 * server's dev/start targets run with cwd at `applications/openthrottle-server`, so a `process.cwd()`
 * default pointed every scheduled agent run at that subdirectory — which both hid the repo from the
 * agent and prevented MCP servers with relative launcher commands (`./scripts/run-*.sh`) from
 * starting at all.
 */

import { describe, expect, it } from 'vitest';
import { resolveScheduledAgentJobCwd } from './scheduled-agent-jobs.constants';

describe('resolveScheduledAgentJobCwd', () => {
  it('prefers an explicit per-schedule cwd', () => {
    expect(resolveScheduledAgentJobCwd('/explicit/path')).toBe(
      '/explicit/path',
    );
  });

  it('trims an explicit cwd and ignores a blank one', () => {
    expect(resolveScheduledAgentJobCwd('  /padded  ')).toBe('/padded');
    expect(resolveScheduledAgentJobCwd('   ')).not.toBe('   ');
  });

  it('falls back to the repo root, not the process cwd, when no cwd is given', () => {
    // The suite runs with cwd at the project root, so these differ — which is exactly the
    // production condition that broke MCP attachment.
    const resolved = resolveScheduledAgentJobCwd(null);

    expect(resolved).not.toMatch(/applications\/openthrottle-server$/u);
  });

  it('resolves a directory that actually contains the workspace marker', async () => {
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');

    const resolved = resolveScheduledAgentJobCwd(undefined);

    expect(existsSync(join(resolved, '.openthrottle.mjs'))).toBe(true);
  });

  it('resolves a directory where the relative MCP launcher commands exist', async () => {
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');

    // `.cursor/mcp.json` launches openthrottle-mcp and github via `bash ./scripts/run-*.sh`.
    // Cursor spawns those with the process cwd, so the resolved cwd MUST contain them.
    const resolved = resolveScheduledAgentJobCwd(undefined);

    expect(
      existsSync(join(resolved, 'scripts', 'run-openthrottle-mcp.sh')),
    ).toBe(true);
    expect(existsSync(join(resolved, '.cursor', 'mcp.json'))).toBe(true);
  });
});
