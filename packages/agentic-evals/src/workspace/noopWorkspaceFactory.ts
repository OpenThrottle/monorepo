import { tmpdir } from 'node:os';

import type { EvalWorkspaceFactory } from './eval-workspace.ts';

/**
 * @description A workspace factory that creates nothing: no git worktree, no setup files, and a
 * `dispose` that does nothing. For suites whose system under test needs no filesystem (a single
 * model call, say). `cwd` is the OS temp directory, so a grader that reads it finds an existing,
 * unrelated path rather than a missing one.
 * @public
 */
export const noopWorkspaceFactory: EvalWorkspaceFactory = {
  create: async () => {
    return {
      cwd: tmpdir(),
      dispose: async () => {
        // Nothing was created.
      },
    };
  },
};
