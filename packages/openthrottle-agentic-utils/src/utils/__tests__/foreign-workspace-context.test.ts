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

describe('resolveForeignWorkspaceContext git identity', () => {
  const OT_COMMON_DIR = `${OT_ROOT}/.git`;
  const OT_WORKTREE = `/home/me/.openthrottle/worktrees/OpenThrottle/monorepo/plan-a`;
  const FOREIGN_REPO = '/code/other-repo';

  /** Stands in for `git rev-parse --git-common-dir`: OT root + its worktree share one common dir. */
  const resolveGitCommonDir = vi.fn((dir: string): string | undefined => {
    if (dir === OT_ROOT || dir === OT_WORKTREE) {
      return OT_COMMON_DIR;
    }
    if (dir === FOREIGN_REPO) {
      return `${FOREIGN_REPO}/.git`;
    }
    return undefined;
  });

  describe('when the cwd is the OpenThrottle root itself', () => {
    it('is not foreign and needs no git lookup', () => {
      getOpenThrottleRootMock.mockReturnValue(OT_ROOT);
      const context = resolveForeignWorkspaceContext(
        OT_ROOT,
        {},
        {
          resolveGitCommonDir,
        },
      );
      expect(context.isForeign).toBe(false);
      expect(resolveGitCommonDir).not.toHaveBeenCalled();
    });
  });

  describe('when the cwd is a worktree of OpenThrottle outside the root path', () => {
    it('is not foreign', () => {
      getOpenThrottleRootMock.mockReturnValue(OT_ROOT);
      const context = resolveForeignWorkspaceContext(
        OT_WORKTREE,
        {},
        {
          resolveGitCommonDir,
        },
      );
      expect(context).toEqual({
        isForeign: false,
        openThrottleRoot: OT_ROOT,
        workingDirectory: OT_WORKTREE,
      });
    });

    it('gets no repository-scope prompt layer', () => {
      getOpenThrottleRootMock.mockReturnValue(OT_ROOT);
      const context = resolveForeignWorkspaceContext(
        OT_WORKTREE,
        {},
        {
          resolveGitCommonDir,
        },
      );
      expect(buildForeignWorkspacePromptLayer(context)).toBeUndefined();
    });
  });

  describe('when the cwd is a different repository', () => {
    it('is foreign', () => {
      getOpenThrottleRootMock.mockReturnValue(OT_ROOT);
      const context = resolveForeignWorkspaceContext(
        FOREIGN_REPO,
        {},
        {
          resolveGitCommonDir,
        },
      );
      expect(context.isForeign).toBe(true);
      expect(buildForeignWorkspacePromptLayer(context)).toContain(
        'NOT the OpenThrottle monorepo',
      );
    });
  });

  describe('when git cannot resolve a common dir', () => {
    it('falls back to path containment (foreign) for an outside cwd', () => {
      getOpenThrottleRootMock.mockReturnValue(OT_ROOT);
      const context = resolveForeignWorkspaceContext(
        '/not/a/repo',
        {},
        {
          resolveGitCommonDir,
        },
      );
      expect(context.isForeign).toBe(true);
    });

    it('stays foreign when the OpenThrottle root itself has no common dir', () => {
      getOpenThrottleRootMock.mockReturnValue(OT_ROOT);
      const context = resolveForeignWorkspaceContext(
        OT_WORKTREE,
        {},
        {
          resolveGitCommonDir: () => {
            return undefined;
          },
        },
      );
      expect(context.isForeign).toBe(true);
    });
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

  it('forbids /skills when nothing was injected (default)', () => {
    const layer = buildForeignWorkspacePromptLayer({
      isForeign: true,
      openThrottleRoot: OT_ROOT,
      workingDirectory: '/other/repo',
    });
    expect(layer).toContain('/skills');
    expect(layer).not.toContain('has made these curated skills available');
  });

  it('advertises injected skills and stops forbidding /skills', () => {
    const layer = buildForeignWorkspacePromptLayer(
      {
        isForeign: true,
        openThrottleRoot: OT_ROOT,
        workingDirectory: '/other/repo',
      },
      { injectedSkillNames: ['create-readme', 'ot-plans'] },
    );
    expect(layer).toBeDefined();
    // The curated skills are advertised as available…
    expect(layer).toContain('/create-readme');
    expect(layer).toContain('/ot-plans');
    expect(layer).toContain('has made these curated skills available');
    // …and the denylist no longer names /skills, but still forbids OT tooling.
    expect(layer).not.toContain(' /skills');
    expect(layer).toContain('@tools/generators');
    expect(layer).toContain('OpenThrottle-monorepo-specific');
  });

  it('treats an empty injected list like no injection', () => {
    const layer = buildForeignWorkspacePromptLayer(
      {
        isForeign: true,
        openThrottleRoot: OT_ROOT,
        workingDirectory: '/other/repo',
      },
      { injectedSkillNames: [] },
    );
    expect(layer).toContain('/skills');
    expect(layer).not.toContain('has made these curated skills available');
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
