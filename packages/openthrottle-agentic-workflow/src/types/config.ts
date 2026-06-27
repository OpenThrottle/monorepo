/**
 * Shared configuration fields for agentic workflows (model, prompts,
 * iteration limits, timeouts). Workflow-specific options belong in downstream packages
 * via {@link WorkflowRunContext} extensions.
 */

export type WorkflowConfigDebug = 'debug' | 'omit' | 'verbose';
/**
 * Any model id string. The `(string & {})` keeps editor autocomplete for the
 * `'auto'` literal while still permitting arbitrary model ids — do not "fix"
 * this to plain `string`, which would drop the suggestion.
 */
export type WorkflowConfigModel = 'auto' | (string & {});
export type WorkflowConfigRunner = 'cursor' | 'claude' | 'opencode';

/**
 * @deprecated Use {@link WorkflowConfig} instead.
 */
export interface WorkflowConfigLegacy {
  readonly debug: WorkflowConfigDebug;
  readonly iterationMax: number;
  readonly iterationTimeout: number | undefined;
  readonly iterations: number;
  readonly model: WorkflowConfigModel;
  readonly prompt: string;
  readonly timeout: number | undefined;
}

export interface WorkflowConfig {
  afterAll?: () => Promise<void>;
  afterEach?: () => Promise<void>;
  beforeAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;

  /**
   * Absolute path to the OpenThrottle root directory. We use this path to run
   * our workflows, skills, prompts, and other resources.
   */
  readonly cwdOpenThrottle: string;

  /**
   * Absolute path to the target working directory we're executing the plan on.
   * This path will live outside of the OpenThrottle root directory and may also
   * contain skills, prompts, and other resources which we execute as part of the plan
   */
  readonly cwdTarget: string;

  /** Debug level for the workflow. */
  readonly debug: WorkflowConfigDebug;

  /** Timeout for the workflow. */
  readonly iterationTimeout: number | undefined;

  /** Number of iterations for the workflow. */
  readonly iterations: number;

  /** Model for the workflow. */
  readonly model: WorkflowConfigModel;

  /** Prompt for the workflow. */
  readonly prompt: string;

  /** Prompt for the workflow. */
  readonly runner: WorkflowConfigRunner;

  /** Timeout for the workflow. */
  readonly timeout: number | undefined;

  /** Worktree for the workflow. */
  readonly worktree?: string;

  /** Worktree base for the workflow. */
  readonly worktreeBase?: string;

  /** Skip worktree setup for the workflow. */
  readonly worktreeSkipSetup?: boolean;
}
