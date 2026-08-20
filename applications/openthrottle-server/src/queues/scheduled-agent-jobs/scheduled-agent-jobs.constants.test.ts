/**
 * @description Tests for the scheduled-agent-jobs constants: the cwd ladder, the env-driven worker
 * concurrency, and the per-directory concurrency key that makes concurrency > 1 safe.
 *
 * `resolveScheduledAgentJobCwd`: The default matters more than it looks: the
 * server's dev/start targets run with cwd at `applications/openthrottle-server`, so a `process.cwd()`
 * default pointed every scheduled agent run at that subdirectory — which both hid the repo from the
 * agent and prevented MCP servers with relative launcher commands (`./scripts/run-*.sh`) from
 * starting at all.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { WORKTREE_FLAG_ONLY } from '@openthrottle/openthrottle-drivers';
import {
  resolveScheduledAgentJobConcurrencyKey,
  resolveScheduledAgentJobCwd,
  resolveScheduledAgentJobRunCwd,
  resolveScheduledAgentJobsConcurrency,
  SCHEDULED_AGENT_JOBS_DEFAULT_CONCURRENCY,
} from './scheduled-agent-jobs.constants';

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

describe('resolveScheduledAgentJobsConcurrency', () => {
  const original = process.env.SCHEDULED_AGENT_JOBS_CONCURRENCY;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.SCHEDULED_AGENT_JOBS_CONCURRENCY;
    } else {
      process.env.SCHEDULED_AGENT_JOBS_CONCURRENCY = original;
    }
  });

  it('defaults above 1, so independent directories can overlap', () => {
    delete process.env.SCHEDULED_AGENT_JOBS_CONCURRENCY;

    expect(resolveScheduledAgentJobsConcurrency()).toBe(
      SCHEDULED_AGENT_JOBS_DEFAULT_CONCURRENCY,
    );
    expect(SCHEDULED_AGENT_JOBS_DEFAULT_CONCURRENCY).toBeGreaterThan(1);
  });

  it('honors a valid env override, including pinning back to 1', () => {
    process.env.SCHEDULED_AGENT_JOBS_CONCURRENCY = '9';
    expect(resolveScheduledAgentJobsConcurrency()).toBe(9);

    // The Redis-less deployment's escape hatch: no lock, so no overlap.
    process.env.SCHEDULED_AGENT_JOBS_CONCURRENCY = '1';
    expect(resolveScheduledAgentJobsConcurrency()).toBe(1);
  });

  it.each(['0', '-2', '2.5', 'four', '', '   '])(
    'falls back for the invalid value %j',
    (value) => {
      process.env.SCHEDULED_AGENT_JOBS_CONCURRENCY = value;

      expect(resolveScheduledAgentJobsConcurrency()).toBe(
        SCHEDULED_AGENT_JOBS_DEFAULT_CONCURRENCY,
      );
    },
  );
});

describe('resolveScheduledAgentJobConcurrencyKey', () => {
  it('keys a plain run on its resolved cwd', () => {
    expect(
      resolveScheduledAgentJobConcurrencyKey({
        cwd: '/repos/monorepo',
        driverSupportsWorktree: true,
      }),
    ).toBe('/repos/monorepo');
  });

  it('collides a legacy explicit cwd with a checkout resolving to the same directory', () => {
    // The acceptance criterion the checkout-id key would have missed: two schedules naming one
    // directory two different ways must serialise.
    const viaCheckout = resolveScheduledAgentJobConcurrencyKey({
      cwd: resolveScheduledAgentJobRunCwd({ checkoutPath: '/repos/monorepo' }),
      driverSupportsWorktree: true,
    });
    const viaLegacyCwd = resolveScheduledAgentJobConcurrencyKey({
      cwd: resolveScheduledAgentJobRunCwd({ explicitCwd: '/repos/monorepo/ ' }),
      driverSupportsWorktree: true,
    });

    expect(viaCheckout).toBe(viaLegacyCwd);
  });

  it.each([
    ['/repos/monorepo/', '/repos/monorepo'],
    ['/repos/monorepo//', '/repos/monorepo'],
    ['  /repos/monorepo  ', '/repos/monorepo'],
    ['C:\\repos\\monorepo\\', 'C:\\repos\\monorepo'],
  ])('normalizes %j to %j', (cwd, expected) => {
    expect(
      resolveScheduledAgentJobConcurrencyKey({
        cwd,
        driverSupportsWorktree: false,
      }),
    ).toBe(expected);
  });

  it('never strips the lone root separator down to nothing', () => {
    expect(
      resolveScheduledAgentJobConcurrencyKey({
        cwd: '/',
        driverSupportsWorktree: false,
      }),
    ).toBe('/');
  });

  it('returns null for a flag-only worktree, which is fresh per run', () => {
    expect(
      resolveScheduledAgentJobConcurrencyKey({
        cwd: '/repos/monorepo',
        driverSupportsWorktree: true,
        worktree: WORKTREE_FLAG_ONLY,
      }),
    ).toBeNull();
  });

  it('folds a named worktree into the key rather than bypassing the lock', () => {
    const nightly = resolveScheduledAgentJobConcurrencyKey({
      cwd: '/repos/monorepo',
      driverSupportsWorktree: true,
      worktree: 'nightly',
    });
    const sameName = resolveScheduledAgentJobConcurrencyKey({
      cwd: '/repos/monorepo/',
      driverSupportsWorktree: true,
      worktree: '  nightly  ',
    });
    const otherName = resolveScheduledAgentJobConcurrencyKey({
      cwd: '/repos/monorepo',
      driverSupportsWorktree: true,
      worktree: 'weekly',
    });

    expect(nightly).toBe(sameName);
    expect(nightly).not.toBe(otherName);
    expect(nightly).not.toBe('/repos/monorepo');
  });

  it('ignores a worktree request the driver cannot honor', () => {
    // codex/opencode drop the flag entirely, so the run really does happen in the cwd.
    expect(
      resolveScheduledAgentJobConcurrencyKey({
        cwd: '/repos/monorepo',
        driverSupportsWorktree: false,
        worktree: WORKTREE_FLAG_ONLY,
      }),
    ).toBe('/repos/monorepo');
    expect(
      resolveScheduledAgentJobConcurrencyKey({
        cwd: '/repos/monorepo',
        driverSupportsWorktree: false,
        worktree: 'nightly',
      }),
    ).toBe('/repos/monorepo');
  });

  it('keys on the cwd when no worktree was requested at all', () => {
    expect(
      resolveScheduledAgentJobConcurrencyKey({
        cwd: '/repos/monorepo',
        driverSupportsWorktree: true,
        worktree: null,
      }),
    ).toBe('/repos/monorepo');
  });
});
