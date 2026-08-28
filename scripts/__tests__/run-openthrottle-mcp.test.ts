import { describe, expect, it } from 'vitest';

import {
  buildCandidateUrls,
  isUnexpandedPlaceholder,
  parseDockerServerPort,
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
