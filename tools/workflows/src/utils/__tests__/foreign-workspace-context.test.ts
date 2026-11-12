import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  buildForeignWorkspacePromptLayer,
  resolveForeignWorkspaceContext,
  resolveForeignWorkspacePromptLayer,
  WORKFLOW_RALPH_OT_ROOT_ENV,
} from '@openthrottle/openthrottle-agentic-utils';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/** Temp dir with pnpm-workspace.yaml to simulate the OpenThrottle monorepo root. */
let otRoot: string;
/** A sibling temp dir (foreign checkout) outside {@link otRoot}. */
let foreignRoot: string;
/** A real git repo standing in for OpenThrottle, with a linked worktree outside its path. */
let otRepoRoot: string;
let otRepoWorktree: string;
/** A second, unrelated git repo. */
let otherRepoRoot: string;

const git = (cwd: string, args: readonly string[]): void => {
  execFileSync('git', [...args], { cwd, stdio: 'ignore' });
};

const initRepo = (dir: string): void => {
  git(dir, ['init', '-q']);
  git(dir, [
    '-c',
    'user.email=test@example.com',
    '-c',
    'user.name=test',
    'commit',
    '-q',
    '--allow-empty',
    '-m',
    'init',
  ]);
};

beforeAll(() => {
  otRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-foreign-root-'));
  fs.writeFileSync(path.join(otRoot, 'pnpm-workspace.yaml'), 'packages: []\n');
  foreignRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'foreign-repo-'));

  otRepoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-git-root-'));
  fs.writeFileSync(
    path.join(otRepoRoot, 'pnpm-workspace.yaml'),
    'packages: []\n',
  );
  initRepo(otRepoRoot);
  // Mirrors ~/.openthrottle/worktrees/<org>/<repo>/<name>: a sibling path, not nested in the root.
  otRepoWorktree = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'ot-git-worktrees-')),
    'plan-a',
  );
  git(otRepoRoot, ['worktree', 'add', '-q', '--detach', otRepoWorktree]);

  otherRepoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'other-git-repo-'));
  initRepo(otherRepoRoot);
});

afterAll(() => {
  fs.rmSync(otRoot, { force: true, recursive: true });
  fs.rmSync(foreignRoot, { force: true, recursive: true });
  fs.rmSync(otRepoRoot, { force: true, recursive: true });
  fs.rmSync(path.dirname(otRepoWorktree), { force: true, recursive: true });
  fs.rmSync(otherRepoRoot, { force: true, recursive: true });
});

describe('resolveForeignWorkspaceContext', () => {
  describe('when cwd is the OpenThrottle root', () => {
    it('is not foreign', () => {
      const env: NodeJS.ProcessEnv = { [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot };
      const context = resolveForeignWorkspaceContext(otRoot, env);

      expect(context.isForeign).toBe(false);
      expect(context.openThrottleRoot).toBe(otRoot);
      expect(context.workingDirectory).toBe(path.resolve(otRoot));
    });
  });

  describe('when cwd is nested inside the OpenThrottle root', () => {
    it('is not foreign', () => {
      const nested = path.join(otRoot, 'applications', 'openthrottle-server');
      const env: NodeJS.ProcessEnv = { [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot };
      const context = resolveForeignWorkspaceContext(nested, env);

      expect(context.isForeign).toBe(false);
    });
  });

  describe('when cwd is a foreign checkout', () => {
    it('is foreign', () => {
      const env: NodeJS.ProcessEnv = { [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot };
      const context = resolveForeignWorkspaceContext(foreignRoot, env);

      expect(context.isForeign).toBe(true);
      expect(context.openThrottleRoot).toBe(otRoot);
      expect(context.workingDirectory).toBe(path.resolve(foreignRoot));
    });
  });

  describe('when cwd is a linked worktree of the OpenThrottle repo outside its path', () => {
    it('is not foreign', () => {
      const env: NodeJS.ProcessEnv = {
        [WORKFLOW_RALPH_OT_ROOT_ENV]: otRepoRoot,
      };
      const context = resolveForeignWorkspaceContext(otRepoWorktree, env);

      expect(context.isForeign).toBe(false);
      expect(
        resolveForeignWorkspacePromptLayer(otRepoWorktree, env),
      ).toBeUndefined();
    });
  });

  describe('when cwd is a different git repository', () => {
    it('is foreign', () => {
      const env: NodeJS.ProcessEnv = {
        [WORKFLOW_RALPH_OT_ROOT_ENV]: otRepoRoot,
      };
      const context = resolveForeignWorkspaceContext(otherRepoRoot, env);

      expect(context.isForeign).toBe(true);
      expect(resolveForeignWorkspacePromptLayer(otherRepoRoot, env)).toContain(
        'NOT the OpenThrottle monorepo',
      );
    });
  });

  describe('when the OpenThrottle root cannot be resolved', () => {
    it('treats the run as non-foreign', () => {
      const unresolvable = fs.mkdtempSync(path.join(os.tmpdir(), 'no-marker-'));

      try {
        const env: NodeJS.ProcessEnv = {};
        const context = resolveForeignWorkspaceContext(unresolvable, env);

        // important contract: a resolvable root + outside cwd => foreign.
        if (context.openThrottleRoot === undefined) {
          expect(context.isForeign).toBe(false);
        } else {
          expect(context.isForeign).toBe(true);
        }
      } finally {
        fs.rmSync(unresolvable, { force: true, recursive: true });
      }
    });
  });
});

describe('buildForeignWorkspacePromptLayer', () => {
  describe('when not foreign', () => {
    it('returns undefined', () => {
      const layer = buildForeignWorkspacePromptLayer({
        isForeign: false,
        openThrottleRoot: otRoot,
        workingDirectory: otRoot,
      });

      expect(layer).toBeUndefined();
    });
  });

  describe('when foreign', () => {
    it('names the working directory and forbids OpenThrottle inventory', () => {
      const layer = buildForeignWorkspacePromptLayer({
        isForeign: true,
        openThrottleRoot: otRoot,
        workingDirectory: foreignRoot,
      });

      expect(layer).toBeDefined();
      expect(layer).toContain(foreignRoot);
      expect(layer).toContain('NOT the OpenThrottle monorepo');
      expect(layer).toContain('Make file changes under this directory');
      expect(layer).toContain('applications/openthrottle-developer');
      expect(layer).toContain('tools/workflows');
    });

    it('omits the root note when the OpenThrottle root is unknown', () => {
      const layer = buildForeignWorkspacePromptLayer({
        isForeign: true,
        openThrottleRoot: undefined,
        workingDirectory: foreignRoot,
      });

      expect(layer).toBeDefined();
      expect(layer).not.toContain('the OpenThrottle monorepo lives at');
    });
  });
});

describe('resolveForeignWorkspacePromptLayer', () => {
  it('returns a layer for a foreign cwd', () => {
    const env: NodeJS.ProcessEnv = { [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot };
    const layer = resolveForeignWorkspacePromptLayer(foreignRoot, env);

    expect(layer).toContain(foreignRoot);
  });

  it('returns undefined for a cwd inside OpenThrottle', () => {
    const env: NodeJS.ProcessEnv = { [WORKFLOW_RALPH_OT_ROOT_ENV]: otRoot };
    const layer = resolveForeignWorkspacePromptLayer(otRoot, env);

    expect(layer).toBeUndefined();
  });
});
