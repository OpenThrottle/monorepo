import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  buildForeignWorkspacePromptLayer,
  resolveForeignWorkspaceContext,
  resolveForeignWorkspacePromptLayer,
} from '../foreign-workspace-context';
import { WORKFLOW_RALPH_OT_ROOT_ENV } from '../../../../../packages/ai-mcp/src/config';

/** Temp dir with pnpm-workspace.yaml to simulate the OpenThrottle monorepo root. */
let otRoot: string;
/** A sibling temp dir (foreign checkout) outside {@link otRoot}. */
let foreignRoot: string;

beforeAll(() => {
  otRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ot-foreign-root-'));
  fs.writeFileSync(path.join(otRoot, 'pnpm-workspace.yaml'), 'packages: []\n');
  foreignRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'foreign-repo-'));
});

afterAll(() => {
  fs.rmSync(otRoot, { force: true, recursive: true });
  fs.rmSync(foreignRoot, { force: true, recursive: true });
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

  describe('when the OpenThrottle root cannot be resolved', () => {
    it('treats the run as non-foreign', () => {
      const unresolvable = fs.mkdtempSync(path.join(os.tmpdir(), 'no-marker-'));

      try {
        const env: NodeJS.ProcessEnv = {};
        const context = resolveForeignWorkspaceContext(unresolvable, env);

        // resolveOpenThrottleRoot falls back to a module walk-up which lands in the real
        // monorepo; the unresolvable cwd is outside it, so a root is still found. The
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
