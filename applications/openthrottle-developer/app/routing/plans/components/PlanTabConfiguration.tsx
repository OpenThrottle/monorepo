import * as React from 'react';
import { useAtom } from 'jotai';
// import classnames from 'classnames';
import {
  Button,
  Card,
  CardContent,
  // CardDescription,
  CardHeader,
  TabsContent,
} from '@openthrottle/react-router-shadcn';
import {
  buildWorkflowRalphOptionArgs,
  DEFAULT_RALPH_PROMPT,
  formatWorkflowRalphCommandLine,
  getDefaultWorkflowRalphRunOptionsInput,
  parseWorkflowRunIterationTimeoutSeconds,
  validateWorkflowRalphRunOptionsState,
  // WORKFLOW_RALPH_DEFAULTS_FILE_NAME,
  // WORKFLOW_RALPH_DEFAULT_PRECEDENCE,
  // WORKFLOW_RALPH_ENV_VARS,
  type WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import { PlanWorkflowCommand } from '~/routing/plans/components/PlanWorkflowCommand';
import { PlanWorkflowConfigExecution } from '~/routing/plans/components/PlanWorkflowConfigExecution';
import { PlanWorkflowConfigPrompt } from '~/routing/plans/components/PlanWorkflowConfigPrompt';
import { PlanWorkflowConfigTarget } from '~/routing/plans/components/PlanWorkflowConfigTarget';
import { PlanWorkflowConfigTuning } from '~/routing/plans/components/PlanWorkflowConfigTuning';
import { PlanWorkflowConfigWorktree } from '~/routing/plans/components/PlanWorkflowConfigWorktree';
import { PlanWorkflowConfigWorkspace } from '~/routing/plans/components/PlanWorkflowConfigWorkspace';
import {
  workflowRalphRunOptionsAtom,
  workflowRunIterationTimeoutTextAtom,
} from '~/routing/plans/data/atom.plan';

/**
 * @description Workflow-ralph CLI options (`--plan` / `--task` and tuning flags)
 * with canonical preview/copy. When the parent controls state (plan detail), the
 * same values are serialized for `enqueuePlanRun` (tuning only; queue is always plan-scoped).
 */
interface PlanTabConfigurationProps {
  readonly className?: string;
  readonly iterationTimeoutText?: string;

  /**
   * @description When set (plan detail URL-driven panel), shows a control to collapse the section.
   */
  readonly onCollapse?: () => void;
  readonly onIterationTimeoutTextChange?: (next: string) => void;
  readonly onValueChange?: (next: WorkflowRalphRunOptionsInput) => void;
  readonly onWorkingDirectoryChange?: (next: string) => void;

  /**
   * @description When set (e.g. plan detail), shows a control to restore tuning fields and iteration timeout to defaults for this plan/task context.
   */
  readonly onResetToDefaults?: () => void;

  /** When set (e.g. plan detail), seeds `--plan` and default target mode. */
  readonly planId?: string;

  /** When set (e.g. task detail), seeds `--task` when plan id is absent. */
  readonly taskId?: string;

  /** Controlled: workflow run options (parent owns for enqueue + CLI preview). */
  readonly value?: WorkflowRalphRunOptionsInput;

  /**
   * @description Optional absolute path for multi-workspace runs. Passed to
   * the enqueue mutation as `workingDirectory`. Empty string = monorepo root.
   */
  readonly workingDirectory?: string;
}

export const PlanTabConfiguration = (props: PlanTabConfigurationProps) => {
  const {
    iterationTimeoutText: iterationTimeoutTextProp,
    onCollapse,
    onIterationTimeoutTextChange,
    onResetToDefaults,
    onValueChange,
    onWorkingDirectoryChange,
    planId,
    taskId,
    value: valueProp,
    workingDirectory = '',
  } = props;

  // Hooks
  const [atomRunOptions, setAtomRunOptions] = useAtom(
    workflowRalphRunOptionsAtom,
  );
  const [atomIterationTimeoutText, setAtomIterationTimeoutText] = useAtom(
    workflowRunIterationTimeoutTextAtom,
  );

  const isControlled =
    valueProp !== undefined &&
    onValueChange !== undefined &&
    iterationTimeoutTextProp !== undefined &&
    onIterationTimeoutTextChange !== undefined;

  const input = isControlled ? valueProp : atomRunOptions;
  const setInput = isControlled
    ? (updater: React.SetStateAction<WorkflowRalphRunOptionsInput>) => {
        const next =
          typeof updater === 'function' ? updater(valueProp) : updater;
        onValueChange(next);
      }
    : (updater: React.SetStateAction<WorkflowRalphRunOptionsInput>) => {
        setAtomRunOptions((prev) =>
          typeof updater === 'function' ? updater(prev) : updater,
        );
      };

  const iterationTimeoutText = isControlled
    ? iterationTimeoutTextProp
    : atomIterationTimeoutText;
  const setIterationTimeoutText = isControlled
    ? onIterationTimeoutTextChange
    : setAtomIterationTimeoutText;

  const strictCliTargetIds =
    (planId != null && planId.trim() !== '') ||
    (taskId != null && taskId.trim() !== '');

  const validation = validateWorkflowRalphRunOptionsState(
    input,
    iterationTimeoutText,
    { requireCliTargetIds: strictCliTargetIds },
  );

  /**
   * @description True after first layout sync in this mounted instance; reset only on
   * unmount so plan/task prop changes do not clear iteration-timeout text (matches
   * prior useEffect re-seed of run options only).
   */
  const uncontrolledSessionStartedRef = React.useRef(false);

  // Setup
  const canonicalCommandLineOverride = isControlled
    ? formatWorkflowRalphCommandLine(
        buildWorkflowRalphOptionArgs({
          ...input,
          iterationTimeoutSeconds:
            parseWorkflowRunIterationTimeoutSeconds(iterationTimeoutText),
        }),
      )
    : undefined;

  // Handlers
  // (Run target: PlanWorkflowConfigTarget)

  // Markup

  // Life Cycle
  React.useEffect(() => {
    return () => {
      uncontrolledSessionStartedRef.current = false;
    };
  }, []);

  React.useLayoutEffect(() => {
    if (isControlled) return;

    setAtomRunOptions(
      getDefaultWorkflowRalphRunOptionsInput({ planId, taskId }),
    );
    if (!uncontrolledSessionStartedRef.current) {
      setAtomIterationTimeoutText('');
      uncontrolledSessionStartedRef.current = true;
    }
  }, [
    isControlled,
    planId,
    taskId,
    setAtomIterationTimeoutText,
    setAtomRunOptions,
  ]);

  // 🔌 Short Circuit

  return (
    <TabsContent
      className="bg-card rounded-lg border border-card-border"
      value="configuration"
    >
      <Card>
        <CardHeader className="pb-2 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              {/* <h2
                className="text-base font-semibold leading-none tracking-tight"
                id="workflow-run-options-title"
              >
                Configuration
              </h2>
              <CardDescription className="space-y-2">
                <p>
                  Compose flags aligned with{' '}
                  <code className="text-xs">
                    pnpm exec workflow-ralph --help
                  </code>{' '}
                  and{' '}
                  <span className="text-xs">
                    tools/workflows (parseRalphArgs)
                  </span>
                  . Resolution when fields are left blank here:{' '}
                  {WORKFLOW_RALPH_DEFAULT_PRECEDENCE}. Enqueue uses the same
                  tuning; unchanged values fall back to worktree / server
                  defaults.
                </p>
                <p className="text-xs">
                  Env mirror (see CLI help): backend →{' '}
                  <code className="text-xs">
                    {WORKFLOW_RALPH_ENV_VARS.backend}
                  </code>
                  ; iterations →{' '}
                  <code className="text-xs">
                    {WORKFLOW_RALPH_ENV_VARS.iterations}
                  </code>
                  ; iteration timeout (seconds) →{' '}
                  <code className="text-xs">
                    {WORKFLOW_RALPH_ENV_VARS.iterationTimeout}
                  </code>
                  ; model →{' '}
                  <code className="text-xs">
                    {WORKFLOW_RALPH_ENV_VARS.model}
                  </code>
                  ; project →{' '}
                  <code className="text-xs">
                    {WORKFLOW_RALPH_ENV_VARS.project}
                  </code>
                  ; prompt / prompt file →{' '}
                  <code className="text-xs">
                    {WORKFLOW_RALPH_ENV_VARS.prompt}
                  </code>{' '}
                  /{' '}
                  <code className="text-xs">
                    {WORKFLOW_RALPH_ENV_VARS.promptFile}
                  </code>
                  ; debug →{' '}
                  <code className="text-xs">
                    {WORKFLOW_RALPH_ENV_VARS.debug}
                  </code>
                  ,{' '}
                  <code className="text-xs">
                    {WORKFLOW_RALPH_ENV_VARS.debugAlias}
                  </code>
                  ,{' '}
                  <code className="text-xs">
                    {WORKFLOW_RALPH_ENV_VARS.verbose}
                  </code>
                  . <code className="text-xs">--debug=verbose</code> matches{' '}
                  <code className="text-xs">--verbose</code> in the CLI.
                </p>
                <p className="text-xs">
                  Optional{' '}
                  <code className="text-xs">
                    ./{WORKFLOW_RALPH_DEFAULTS_FILE_NAME}
                  </code>{' '}
                  in the shell cwd merges before argv (
                  <code className="text-xs">mergeRalphRuntimeSeed</code>,{' '}
                  <code className="text-xs">tools/workflows</code>
                  ): JSON keys <code className="text-xs">backend</code>,{' '}
                  <code className="text-xs">iterations</code>,{' '}
                  <code className="text-xs">iterationTimeout</code> (seconds —
                  same unit as{' '}
                  <code className="text-xs">--iteration-timeout</code>),{' '}
                  <code className="text-xs">model</code>,{' '}
                  <code className="text-xs">project</code>, and either{' '}
                  <code className="text-xs">prompt</code> or{' '}
                  <code className="text-xs">promptFile</code> (not both —
                  matches CLI <code className="text-xs">--prompt</code> /{' '}
                  <code className="text-xs">--prompt-file</code> mutual
                  exclusion).
                </p>
              </CardDescription> */}
            </div>

            {onResetToDefaults != null || onCollapse != null ? (
              <div className="flex shrink-0 items-center gap-2">
                {onResetToDefaults != null ? (
                  <Button
                    aria-label="Reset workflow run options to defaults"
                    data-testid="workflow-run-options-reset"
                    onClick={onResetToDefaults}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Reset to defaults
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 gap-4">
          {!validation.ok ? (
            <div
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              data-testid="workflow-run-validation"
              role="alert"
            >
              <p className="font-medium">
                Workflow options blocked until fixed
              </p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {validation.issues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* <Card className="mt-8">
        <CardHeader className="pb-2 mb-4">
          PlanWorkflowConfigExecution
        </CardHeader>
        <CardContent>
        </CardContent>
      </Card> */}
      <PlanWorkflowConfigTarget input={input} setInput={setInput} />
      {onWorkingDirectoryChange != null && (
        <PlanWorkflowConfigWorkspace
          onChange={onWorkingDirectoryChange}
          value={workingDirectory}
        />
      )}

      <PlanWorkflowConfigPrompt
        onPromptChange={(next) =>
          setInput((prev) => ({ ...prev, prompt: next }))
        }
        onPromptFileChange={(next) =>
          setInput((prev) => ({ ...prev, promptFile: next }))
        }
        onPromptLayerChange={(next) => {
          setInput((prev) => {
            if (next === 'named') {
              return { ...prev, promptFile: '', promptLayer: 'named' };
            }

            return {
              ...prev,
              prompt: DEFAULT_RALPH_PROMPT,
              promptLayer: 'file',
            };
          });
        }}
        prompt={input.prompt}
        promptFile={input.promptFile}
        promptLayer={input.promptLayer}
      />

      <PlanWorkflowConfigExecution input={input} setInput={setInput} />

      <PlanWorkflowConfigWorktree input={input} setInput={setInput} />

      <PlanWorkflowConfigTuning
        input={input}
        iterationTimeoutText={iterationTimeoutText}
        setInput={setInput}
        setIterationTimeoutText={setIterationTimeoutText}
      />

      <Card className="mt-8">
        <CardHeader className="pb-2 mb-4">PlanWorkflowCommand</CardHeader>
        <CardContent>
          <PlanWorkflowCommand
            canonicalCommandLineOverride={canonicalCommandLineOverride}
          />
        </CardContent>
      </Card>
    </TabsContent>
  );
};
