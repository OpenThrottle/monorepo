import { spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildCandidateUrls,
  isUnexpandedPlaceholder,
  parseDockerServerPort,
  resolveClientWorkspacePath,
} from '../run-openthrottle-mcp.ts';

describe('isUnexpandedPlaceholder', () => {
  it('treats literal ${...} passthroughs as unset', () => {
    expect(isUnexpandedPlaceholder('${OPENTHROTTLE_MCP_AUTH_TOKEN}')).toBe(true); // prettier-ignore
    expect(isUnexpandedPlaceholder('ot_sa_prefix_secret')).toBe(false);
    expect(isUnexpandedPlaceholder(undefined)).toBe(false);
  });
});

describe('parseDockerServerPort', () => {
  it('finds the first published port of a server-named container', () => {
    const ps = [
      'openthrottle-postgres\t0.0.0.0:6010->5432/tcp',
      'openthrottle-server\t0.0.0.0:6021->6021/tcp, :::6021->6021/tcp',
    ].join('\n');

    expect(parseDockerServerPort(ps)).toBe('6021');
  });

  it('returns undefined without a server container or ports', () => {
    expect(parseDockerServerPort('redis\t0.0.0.0:6011->6379/tcp')).toBeUndefined(); // prettier-ignore
    expect(parseDockerServerPort('openthrottle-server\t')).toBeUndefined();
    expect(parseDockerServerPort('')).toBeUndefined();
  });
});

describe('buildCandidateUrls', () => {
  const inputs = {
    dockerUrl: 'http://localhost:9000',
    rootUrl: 'http://localhost:6021',
    worktreeUrl: 'http://localhost:7421',
  };

  it('is stable-first by default, worktree as liveness fallback', () => {
    expect(buildCandidateUrls(inputs)).toEqual([
      'http://localhost:6021',
      'http://localhost:9000',
      'http://localhost:7421',
    ]);
  });

  it('prefers the worktree with OT_MCP_TARGET=worktree', () => {
    expect(buildCandidateUrls({ ...inputs, target: 'worktree' })[0]).toBe(
      'http://localhost:7421',
    );
  });

  it('always ends on the canonical fallback and de-dupes', () => {
    expect(buildCandidateUrls({})).toEqual(['http://localhost:6021']);
    expect(buildCandidateUrls({ rootUrl: 'http://localhost:6021' })).toEqual([
      'http://localhost:6021',
    ]);
  });
});

describe('resolveClientWorkspacePath', () => {
  const CHECKOUT = '/Users/dev/openthrottle';
  const FOREIGN = '/Users/dev/github/acme/native-apps';

  it('reports the caller cwd, so a foreign checkout is not erased by the chdir', () => {
    expect(resolveClientWorkspacePath({ cwd: FOREIGN })).toBe(FOREIGN);
  });

  it('still reports the checkout when the caller launched from inside it', () => {
    expect(resolveClientWorkspacePath({ cwd: CHECKOUT })).toBe(CHECKOUT);
  });

  it('lets an explicit override beat the cwd, trimmed', () => {
    expect(
      resolveClientWorkspacePath({ cwd: CHECKOUT, override: `  ${FOREIGN}  ` }),
    ).toBe(FOREIGN);
  });

  it('falls back to the cwd for an empty or unexpanded override', () => {
    expect(resolveClientWorkspacePath({ cwd: FOREIGN, override: '   ' })).toBe(FOREIGN); // prettier-ignore
    expect(
      resolveClientWorkspacePath({
        cwd: FOREIGN,
        override: '${OPENTHROTTLE_MCP_WORKSPACE_PATH}',
      }),
    ).toBe(FOREIGN);
  });
});

/**
 * The unit tests above cover the resolver in isolation, but the invariant this
 * plan exists to protect is an ORDERING one — the caller's cwd must be read
 * BEFORE the launcher chdirs into the checkout — and no pure function can
 * assert that. So run the real shim from a directory that is deliberately not
 * the checkout and read back the workspace it reports. Resolve-only mode
 * narrates the workspace before it probes for a server, so this stays fast and
 * does not need one running.
 */
describe('the launcher reports the caller workspace, not the checkout it runs in', () => {
  it('survives its own chdir', () => {
    const callerCwd = realpathSync(mkdtempSync(join(tmpdir(), 'ot-mcp-cwd-')));
    const shim = join(import.meta.dirname, '..', 'run-openthrottle-mcp.sh');

    try {
      const result = spawnSync('bash', [shim], {
        cwd: callerCwd,
        encoding: 'utf8',
        env: { ...process.env, OT_MCP_RESOLVE_ONLY: '1' },
        timeout: 20_000,
      });

      expect(result.stderr).toContain(`author workspace ${callerCwd}`);
    } finally {
      rmSync(callerCwd, { force: true, recursive: true });
    }
  });
});
