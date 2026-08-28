import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CANONICAL_APP_PORTS,
  deriveBase,
  PORT_BASE_MAX,
  PORT_BASE_MIN,
  PORT_BLOCK_SIZE,
  PORT_BLOCKS,
  portsForBase,
  posixCksum,
  resolveWorktreePorts,
} from '../lib/worktree-ports.ts';

describe('posixCksum', () => {
  // Reference values from the host cksum(1): printf '%s' name | cksum
  it('is byte-compatible with POSIX cksum', () => {
    expect(posixCksum('loop-plan-scripts-fresh-coat')).toBe(267805292);
    expect(posixCksum('my-feature')).toBe(3673379394);
    expect(posixCksum('wt-abc12345')).toBe(2791833764);
    expect(posixCksum('a')).toBe(1220704766);
  });
});

describe('deriveBase', () => {
  it('is stable and lands on a block inside the deterministic range', () => {
    const base = deriveBase('my-feature');

    expect(base).toBe(deriveBase('my-feature'));
    expect(base).toBeGreaterThanOrEqual(PORT_BASE_MIN);
    expect(base).toBeLessThan(PORT_BASE_MIN + PORT_BLOCKS * PORT_BLOCK_SIZE);
    expect((base - PORT_BASE_MIN) % PORT_BLOCK_SIZE).toBe(0);
  });

  it('matches the shell formula (cksum % blocks)', () => {
    expect(deriveBase('my-feature')).toBe(
      PORT_BASE_MIN + (3673379394 % PORT_BLOCKS) * PORT_BLOCK_SIZE,
    );
  });
});

describe('portsForBase', () => {
  it('preserves the canonical relative offsets', () => {
    expect(portsForBase(7100)).toEqual({
      admin: 7102,
      cms: 7103,
      developer: 7100,
      email: 7104,
      mcp: 7106,
      server: 7101,
      website: 7105,
    });
  });

  it('maps the canonical base onto the canonical ports', () => {
    expect(portsForBase(6020)).toEqual(CANONICAL_APP_PORTS);
  });
});

describe('resolveWorktreePorts', () => {
  const free = (): boolean => false;

  it('uses the deterministic slot when every port is free', () => {
    const { base } = resolveWorktreePorts('my-feature', { isPortInUse: free });

    expect(base).toBe(deriveBase('my-feature'));
  });

  it('bumps past occupied blocks', () => {
    const expected = deriveBase('my-feature');
    // The whole deterministic block is busy; the next one is free.
    const isPortInUse = (port: number): boolean =>
      port >= expected && port <= expected + 6;

    const { base } = resolveWorktreePorts('my-feature', { isPortInUse });

    expect(base).toBe(expected + PORT_BLOCK_SIZE);
  });

  it('throws at the ceiling when nothing is free', () => {
    expect(() =>
      resolveWorktreePorts('my-feature', { isPortInUse: () => true }),
    ).toThrow(new RegExp(`${PORT_BASE_MIN}-${PORT_BASE_MAX}`));
  });

  it('pins and reuses the cache across re-resolutions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wt-ports-'));

    const first = resolveWorktreePorts('my-feature', {
      isPortInUse: free,
      worktreeDir: dir,
    });

    expect(readFileSync(join(dir, '.worktree-ports'), 'utf8')).toBe(
      `OT_PORT_BASE=${first.base}\n`,
    );

    // A pinned base wins even over a "port busy" probe.
    const second = resolveWorktreePorts('my-feature', {
      isPortInUse: () => true,
      worktreeDir: dir,
    });

    expect(second.base).toBe(first.base);
  });

  it('honors a hand-written pin', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wt-ports-'));
    writeFileSync(join(dir, '.worktree-ports'), 'OT_PORT_BASE=7310\n');

    const { base, ports } = resolveWorktreePorts('whatever', {
      isPortInUse: free,
      worktreeDir: dir,
    });

    expect(base).toBe(7310);
    expect(ports.server).toBe(7311);
  });
});
