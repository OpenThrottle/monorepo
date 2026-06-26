import { resolve, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  resolveInsideRoot,
  resolveWorkspaceConfig,
} from '../workspace-config.js';

describe('resolveInsideRoot', () => {
  const resolved = resolveWorkspaceConfig({ root: `${sep}repo` });

  it('resolves a contained relative path to its absolute path', () => {
    expect(resolveInsideRoot(resolved, 'src/app.ts')).toBe(
      resolve(`${sep}repo`, 'src/app.ts'),
    );
  });

  it('allows the root itself', () => {
    expect(resolveInsideRoot(resolved, '.')).toBe(resolved.root);
  });

  it('rejects a `../` traversal that escapes the root', () => {
    expect(resolveInsideRoot(resolved, '../../etc/passwd')).toBeUndefined();
  });

  it('rejects an absolute path', () => {
    expect(
      resolveInsideRoot(resolved, `${sep}etc${sep}passwd`),
    ).toBeUndefined();
  });

  it('rejects a sibling-directory prefix that is not contained', () => {
    // `/repo-secrets` shares the `/repo` prefix but is a different directory.
    const repoConfig = resolveWorkspaceConfig({ root: `${sep}repo` });
    expect(
      resolveInsideRoot(repoConfig, `..${sep}repo-secrets${sep}key`),
    ).toBeUndefined();
  });
});
