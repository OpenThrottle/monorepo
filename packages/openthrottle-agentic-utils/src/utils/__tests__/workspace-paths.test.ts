import { describe, expect, it } from 'vitest';

import {
  CONTAINER_WORKSPACES_DIR_ENV,
  HOST_WORKSPACES_DIR_ENV,
  getWorkspacePathMapping,
  toContainerPath,
  toHostPath,
} from '../workspace-paths.ts';

/** Env with the bridge mapping active (macOS-style host root). */
const mappedEnv: NodeJS.ProcessEnv = {
  [CONTAINER_WORKSPACES_DIR_ENV]: '/workspaces',
  [HOST_WORKSPACES_DIR_ENV]: '/Users/jane/dev',
};

describe('getWorkspacePathMapping', () => {
  it('returns undefined when neither env var is set', () => {
    expect(getWorkspacePathMapping({})).toBeUndefined();
  });

  it('returns undefined when only one env var is set', () => {
    expect(
      getWorkspacePathMapping({ [HOST_WORKSPACES_DIR_ENV]: '/Users/jane/dev' }),
    ).toBeUndefined();
    expect(
      getWorkspacePathMapping({
        [CONTAINER_WORKSPACES_DIR_ENV]: '/workspaces',
      }),
    ).toBeUndefined();
  });

  it('returns undefined when a value is blank', () => {
    expect(
      getWorkspacePathMapping({
        [CONTAINER_WORKSPACES_DIR_ENV]: '  ',
        [HOST_WORKSPACES_DIR_ENV]: '/Users/jane/dev',
      }),
    ).toBeUndefined();
  });

  it('strips trailing slashes from both prefixes', () => {
    expect(
      getWorkspacePathMapping({
        [CONTAINER_WORKSPACES_DIR_ENV]: '/workspaces/',
        [HOST_WORKSPACES_DIR_ENV]: '/Users/jane/dev/',
      }),
    ).toEqual({ containerDir: '/workspaces', hostDir: '/Users/jane/dev' });
  });
});

describe('toContainerPath', () => {
  it('is identity when no mapping is configured', () => {
    expect(toContainerPath('/Users/jane/dev/my-app', {})).toBe(
      '/Users/jane/dev/my-app',
    );
  });

  it('translates paths under the host root', () => {
    expect(toContainerPath('/Users/jane/dev/my-app', mappedEnv)).toBe(
      '/workspaces/my-app',
    );
  });

  it('translates the host root itself', () => {
    expect(toContainerPath('/Users/jane/dev', mappedEnv)).toBe('/workspaces');
  });

  it('is identity for paths outside the mapped root', () => {
    expect(toContainerPath('/opt/elsewhere/my-app', mappedEnv)).toBe(
      '/opt/elsewhere/my-app',
    );
  });

  it('does not match partial path segments', () => {
    expect(toContainerPath('/Users/jane/dev-other/my-app', mappedEnv)).toBe(
      '/Users/jane/dev-other/my-app',
    );
  });
});

describe('toHostPath', () => {
  it('is identity when no mapping is configured', () => {
    expect(toHostPath('/workspaces/my-app', {})).toBe('/workspaces/my-app');
  });

  it('translates container paths back to the host view', () => {
    expect(toHostPath('/workspaces/my-app', mappedEnv)).toBe(
      '/Users/jane/dev/my-app',
    );
  });

  it('round-trips with toContainerPath', () => {
    const original = '/Users/jane/dev/my-app/src/index.ts';
    expect(toHostPath(toContainerPath(original, mappedEnv), mappedEnv)).toBe(
      original,
    );
  });
});
