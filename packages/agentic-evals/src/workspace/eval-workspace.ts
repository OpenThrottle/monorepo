import type { EvalCase } from '../types/index.ts';

/**
 * @description A directory the agent works in for one attempt. `dispose` removes it and must be
 * safe to call once, after grading.
 * @public
 */
export interface EvalWorkspace {
  readonly cwd: string;
  readonly dispose: () => Promise<void>;
}

/**
 * @description Hands out one isolated {@link EvalWorkspace} per (case, attempt). `create` rejects
 * when the workspace cannot be made; the runner turns that into an `errored` trial.
 * @public
 */
export interface EvalWorkspaceFactory {
  readonly create: (
    evalCase: EvalCase,
    attempt: number,
  ) => Promise<EvalWorkspace>;
}
