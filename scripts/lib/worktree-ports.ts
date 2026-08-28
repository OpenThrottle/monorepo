/**
 * @description Deterministic per-worktree app-port allocation — the .ts home
 * of the logic that lived in the *sourced* scripts/worktree_ports.sh. The
 * provisioner imports it directly instead of sourcing exports.
 *
 * Running OpenThrottle to build OpenThrottle means each worktree's dev servers
 * would otherwise fight the ports the main checkout already binds. Each
 * worktree gets its own coherent block in the 7000 range, derived from the
 * worktree name (POSIX cksum CRC — kept bit-compatible so existing worktrees
 * keep their blocks), with a free-port bump to dodge the rare collision.
 *
 * Only the SEVEN app ports are offset. Postgres (6010) and Redis (6011) are
 * left alone — worktrees share the main checkout's already-running database.
 *
 * IMPORTANT: this module must stay dependency-free (node builtins only). It
 * runs during worktree provisioning, before `pnpm install` has populated the
 * new worktree's node_modules.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { run } from './exec.ts';

/**
 * The canonical 6020..6026 ports from .env.default, in app order. The block
 * preserves these relative offsets (developer=base+0 … mcp=base+6). This is
 * the single source for the provisioner's port-rewrite map.
 */
export const CANONICAL_APP_PORTS = {
  admin: 6022,
  cms: 6023,
  developer: 6020,
  email: 6024,
  mcp: 6026,
  server: 6021,
  website: 6025,
} as const;

export type AppPortName = keyof typeof CANONICAL_APP_PORTS;

/** The app names in canonical order, for cast-free iteration over the map. */
export const APP_PORT_NAMES: readonly AppPortName[] = [
  'admin',
  'cms',
  'developer',
  'email',
  'mcp',
  'server',
  'website',
] as const;

export const PORT_BASE_MIN = 7000; // first worktree block
export const PORT_BLOCKS = 50; // deterministic blocks 7000, 7010, … 7490
export const PORT_BLOCK_SIZE = 10;
export const PORT_BASE_MAX = 7990; // ceiling while bumping (collision headroom)

/** The seven app ports for a block base, preserving the canonical offsets. */
export const portsForBase = (base: number): Record<AppPortName, number> => ({
  admin: base + 2,
  cms: base + 3,
  developer: base,
  email: base + 4,
  mcp: base + 6,
  server: base + 1,
  website: base + 5,
});

/**
 * POSIX `cksum` CRC (ISO/IEC 8802-3 CRC-32, MSB-first, length appended,
 * complemented) — byte-compatible with the shell's `printf '%s' name | cksum`
 * so existing worktrees keep their deterministic block.
 */
export const posixCksum = (input: string): number => {
  const bytes = Buffer.from(input, 'utf8');
  let crc = 0;

  const feed = (byte: number): void => {
    crc ^= byte << 24;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x80000000 ? ((crc << 1) ^ 0x04c11db7) >>> 0 : (crc << 1) >>> 0; // prettier-ignore
    }
  };

  for (const byte of bytes) {
    feed(byte);
  }

  // The length is fed low byte first, until exhausted.
  let length = bytes.length;
  while (length > 0) {
    feed(length & 0xff);
    length >>>= 8;
  }

  return ~crc >>> 0;
};

/** The deterministic block base for a worktree name (before collision bump). */
export const deriveBase = (name: string): number =>
  PORT_BASE_MIN + (posixCksum(name) % PORT_BLOCKS) * PORT_BLOCK_SIZE;

/** True when a TCP port has a LISTENing socket on this host. */
export const isPortListening = (port: number): boolean =>
  run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], { allowFailure: true })
    .exitCode === 0;

export interface ResolvePortsOptions {
  /** Injectable port probe, for tests; defaults to lsof. */
  isPortInUse?: (port: number) => boolean;
  /** Worktree directory holding the .worktree-ports pin; omit to skip caching. */
  worktreeDir?: string;
}

export interface ResolvedPorts {
  base: number;
  ports: Record<AppPortName, number>;
}

const CACHE_FILENAME = '.worktree-ports';

const readCachedBase = (worktreeDir: string): number | undefined => {
  try {
    const contents = readFileSync(join(worktreeDir, CACHE_FILENAME), 'utf8');
    const match = contents.match(/^OT_PORT_BASE=(\d+)$/m);

    return match ? Number(match[1]) : undefined;
  } catch {
    return undefined;
  }
};

const writeCachedBase = (worktreeDir: string, base: number): void => {
  try {
    writeFileSync(join(worktreeDir, CACHE_FILENAME), `OT_PORT_BASE=${base}\n`);
  } catch {
    // Cache write failure is non-fatal — the deterministic hash re-resolves.
  }
};

/**
 * Resolve the app-port block for a worktree: cached pin first (so a worktree
 * keeps its ports across re-setups even through a collision-bumped
 * allocation), then the deterministic hash slot, bumping past blocks that are
 * (partly) in use. Throws when no block is free below the ceiling.
 */
export const resolveWorktreePorts = (
  name: string,
  options: ResolvePortsOptions = {},
): ResolvedPorts => {
  const isPortInUse = options.isPortInUse ?? isPortListening;

  const cached = options.worktreeDir
    ? readCachedBase(options.worktreeDir)
    : undefined;

  let base = cached;

  if (base === undefined) {
    base = deriveBase(name);

    const blockFree = (candidate: number): boolean => {
      for (let port = candidate; port <= candidate + 6; port += 1) {
        if (isPortInUse(port)) {
          return false;
        }
      }

      return true;
    };

    while (!blockFree(base)) {
      base += PORT_BLOCK_SIZE;

      if (base > PORT_BASE_MAX) {
        throw new Error(
          `worktree-ports: no free app-port block in ${PORT_BASE_MIN}-${PORT_BASE_MAX}`,
        );
      }
    }
  }

  if (options.worktreeDir) {
    writeCachedBase(options.worktreeDir, base);
  }

  return { base, ports: portsForBase(base) };
};
