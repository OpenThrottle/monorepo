import * as path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const { getOpenThrottleRootMock } = vi.hoisted(() => ({
  getOpenThrottleRootMock: vi.fn(),
}));

vi.mock('../workflow.ts', () => ({
  getOpenThrottleRoot: getOpenThrottleRootMock,
}));

import {
  buildForeignWorkspacePromptLayer,
  resolveForeignWorkspaceContext,
  resolveForeignWorkspacePromptLayer,
} from '../foreign-workspace-context.ts';

const OT_ROOT = '/repo/openthrottle';

afterEach(() => {
  vi.clearAllMocks();
});

describe('resolveForeignWorkspaceContext', () => {
  it('is not foreign when the cwd equals the OpenThrottle root', () => {
    getOpenThrottleRootMock.mockReturnValue(OT_ROOT);
    const context = resolveForeignWorkspaceContext(OT_ROOT, {});
    expect(context).toEqual({
      isForeign: false,
      openThrottleRoot: OT_ROOT,
      workingDirectory: OT_ROOT,
    });
  });

  it('is not foreign when the cwd is nested within the OpenThrottle root', () => {
    getOpenThrottleRootMock.mockReturnValue(OT_ROOT);
    const nested = path.join(OT_ROOT, 'applications/openthrottle-server');
    const context = resolveForeignWorkspaceContext(nested, {});
    expect(context.isForeign).toBe(false);
    expect(context.workingDirectory).toBe(path.resolve(nested));
  });

  it('is foreign when the cwd is outside the OpenThrottle root', () => {
    getOpenThrottleRootMock.mockReturnValue(OT_ROOT);
    const context = resolveForeignWorkspaceContext('/other/repo', {});
    expect(context).toEqual({
      isForeign: true,
      openThrottleRoot: OT_ROOT,
      workingDirectory: '/other/repo',
    });
  });

  it('is not foreign when the OpenThrottle root cannot be resolved at all', () => {
    getOpenThrottleRootMock.mockReturnValue(undefined);
    const context = resolveForeignWorkspaceContext('/other/repo', {});
    expect(context).toEqual({
      isForeign: false,
      openThrottleRoot: undefined,
      workingDirectory: '/other/repo',
    });
  });

  it('resolves a relative cwd to an absolute path', () => {
    getOpenThrottleRootMock.mockReturnValue(OT_ROOT);
    const context = resolveForeignWorkspaceContext('relative/dir', {});
    expect(path.isAbsolute(context.workingDirectory)).toBe(true);
  });

  it('is not fooled by a sibling directory sharing the root as a string prefix', () => {
    getOpenThrottleRootMock.mockReturnValue(OT_ROOT);
    const context = resolveForeignWorkspaceContext(
      '/repo/openthrottle-other',
      {},
    );
    expect(context.isForeign).toBe(true);
  });
});

describe('buildForeignWorkspacePromptLayer', () => {
  it('returns undefined when the context is not foreign', () => {
    expect(
      buildForeignWorkspacePromptLayer({
        isForeign: false,
        openThrottleRoot: OT_ROOT,
        workingDirectory: OT_ROOT,
      }),
    ).toBeUndefined();
  });

  it('mentions the working directory and the OpenThrottle root when foreign', () => {
    const layer = buildForeignWorkspacePromptLayer({
      isForeign: true,
      openThrottleRoot: OT_ROOT,
      workingDirectory: '/other/repo',
    });
    expect(layer).toBeDefined();
    expect(layer).toContain('/other/repo');
    expect(layer).toContain(OT_ROOT);
    expect(layer).toContain('Repository scope');
    expect(layer).toContain('NOT the OpenThrottle monorepo');
  });

  it('omits the OpenThrottle root note when it is unresolved', () => {
    const layer = buildForeignWorkspacePromptLayer({
      isForeign: true,
      openThrottleRoot: undefined,
      workingDirectory: '/other/repo',
    });
    expect(layer).toBeDefined();
    expect(layer).not.toContain('the OpenThrottle monorepo lives at');
    expect(layer).toContain('/other/repo');
  });
});

describe('resolveForeignWorkspacePromptLayer', () => {
  it('composes resolution + prompt building end to end for a foreign cwd', () => {
    getOpenThrottleRootMock.mockReturnValue(OT_ROOT);
    const layer = resolveForeignWorkspacePromptLayer('/other/repo', {});
    expect(layer).toContain('/other/repo');
    expect(layer).toContain(OT_ROOT);
  });

  it('returns undefined end to end for a cwd inside the OpenThrottle root', () => {
    getOpenThrottleRootMock.mockReturnValue(OT_ROOT);
    expect(resolveForeignWorkspacePromptLayer(OT_ROOT, {})).toBeUndefined();
  });
});
