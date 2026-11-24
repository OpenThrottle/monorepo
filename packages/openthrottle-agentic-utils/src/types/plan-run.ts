/**
 * @description Result of one host command (git, gh, or a local script) run during a plan run's
 * finish step. Exit code 0 is success; stdout/stderr are UTF-8 text (may be empty).
 * @public
 */
export interface PlanRunCommandResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

/**
 * @description Injectable host command runner for a plan run (`git`, `gh`, and the
 * github-pull-request skill's `check-attribution.sh`). Unit tests supply a fake; production uses
 * `createPlanRunCommandRunner`. Never shells: argv is passed as an array.
 * @public
 */
export type PlanRunCommandRunner = (params: {
  readonly args: readonly string[];
  readonly command: string;
  readonly cwd: string;
}) => Promise<PlanRunCommandResult>;

/**
 * @description One stdout/stderr fragment from a plan run's agent or finish step; backend-agnostic.
 * @public
 */
export interface PlanRunStreamChunk {
  readonly data: string;
  readonly stream: 'stdout' | 'stderr';
}

/**
 * @description Optional streaming hook for a plan run's output. The run still buffers full output
 * for parsing; this is for side effects only (logs, WebSocket, `append_plan_output`, etc.).
 * @public
 */
export type PlanRunOnChunk = (
  chunk: PlanRunStreamChunk,
) => void | Promise<void>;
