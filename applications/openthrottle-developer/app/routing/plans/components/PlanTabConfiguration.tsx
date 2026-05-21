import * as React from 'react';
import { useAtom } from 'jotai';
import {
  Card,
  CardContent,
  TabsContent,
} from '@openthrottle/react-router-shadcn';
import {
  buildWorkflowRalphOptionArgs,
  DEFAULT_RALPH_PROMPT,
  formatWorkflowRalphCommandLine,
  getDefaultWorkflowRalphRunOptionsInput,
  parseWorkflowRunIterationTimeoutSeconds,
  validateWorkflowRalphRunOptionsState,
  type WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import { PlanWorkflowCommand } from '~/routing/plans/components/PlanWorkflowCommand';
import { PlanWorkflowConfigExecution } from '~/routing/plans/components/PlanWorkflowConfigExecution';
import { PlanWorkflowConfigPrompt } from '~/routing/plans/components/PlanWorkflowConfigPrompt';
import { PlanWorkflowConfigTarget } from '~/routing/plans/components/PlanWorkflowConfigTarget';
import { PlanWorkflowConfigHooks } from '~/routing/plans/components/PlanWorkflowConfigHooks';
import { PlanWorkflowConfigTuning } from '~/routing/plans/components/PlanWorkflowConfigTuning';
import { PlanWorkflowConfigWorktree } from '~/routing/plans/components/PlanWorkflowConfigWorktree';
import { PlanWorkflowConfigWorkspace } from '~/routing/plans/components/PlanWorkflowConfigWorkspace';
import type { JobRunHookDraftRow } from '~/routing/plans/utils/job-run-hooks-ui';
import {
  workflowRalphRunOptionsAtom,
  workflowRunIterationTimeoutTextAtom,
} from '~/routing/plans/data/atom.plan';

/**
 * @description Workflow-ralph CLI options (`--plan` / `--task` and tuning flags)
 * with canonical preview/copy. When the parent controls state (plan detail), the
 * same values are serialized for `enqueuePlanRun` (tuning only; queue is always plan-scoped).
 */
export interface PlanTabConfigurationProps {
  className?: string;
  iterationTimeoutText?: string;

  /**
   * @description When set (plan detail URL-driven panel), shows a control to collapse the section.
   */
  onCollapse?: () => void;
  onIterationTimeoutTextChange?: (next: string) => void;
  onValueChange?: (next: WorkflowRalphRunOptionsInput) => void;
  onWorkingDirectoryChange?: (next: string) => void;

  /**
   * @description When set (e.g. plan detail), shows a control to restore tuning fields and iteration timeout to defaults for this plan/task context.
   */
  onResetToDefaults?: () => void;

  /** When set (e.g. plan detail), seeds `--plan` and default target mode. */
  planId?: string;

  /** When set (e.g. task detail), seeds `--task` when plan id is absent. */
  taskId?: string;

  /** Controlled: workflow run options (parent owns for enqueue + CLI preview). */
  value?: WorkflowRalphRunOptionsInput;

  /** Controlled: job-run lifecycle hooks (parent owns for enqueue + save). */
  jobRunHookRows?: readonly JobRunHookDraftRow[];
  onJobRunHookRowsChange: (next: JobRunHookDraftRow[]) => void;
  onSaveJobRunHooks: () => void;
  saveJobRunHooksDisabled?: boolean;
  saveJobRunHooksPending?: boolean;

  /**
   * @description Optional absolute path for multi-workspace runs. Passed to
   * the enqueue mutation as `workingDirectory`. Empty string = monorepo root.
   */
  workingDirectory?: string;
}

export const PlanTabConfiguration = (props: PlanTabConfigurationProps) => {
  const {
    iterationTimeoutText: iterationTimeoutTextProp,
    onCollapse: _onCollapse, // FIXME: Trim this bad boy
    onIterationTimeoutTextChange,
    jobRunHookRows,
    onJobRunHookRowsChange,
    onResetToDefaults,
    onSaveJobRunHooks,
    onValueChange,
    onWorkingDirectoryChange,
    planId,
    saveJobRunHooksDisabled,
    saveJobRunHooksPending,
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
  const command = isControlled
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
    <TabsContent value="configuration">
      <div className="flex flex-col gap-4 md:gap-8">
        <Card className="p-4">
          <PlanWorkflowCommand command={command} onReset={onResetToDefaults} />
        </Card>

        <div className="space-y-4 md:space-y-8">
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
        </div>

        <PlanWorkflowConfigTarget
          heading="01. Target"
          input={input}
          setInput={setInput}
        />

        {onWorkingDirectoryChange != null && (
          <PlanWorkflowConfigWorkspace
            heading="02. Workspace"
            onChange={onWorkingDirectoryChange}
            value={workingDirectory}
          />
        )}

        <PlanWorkflowConfigHooks
          heading="03. Lifecycle"
          hooks={jobRunHookRows ?? []}
          onChange={onJobRunHookRowsChange}
          onSave={onSaveJobRunHooks}
          saveDisabled={saveJobRunHooksDisabled}
          savePending={saveJobRunHooksPending}
        />

        <PlanWorkflowConfigPrompt
          heading="04. Prompt"
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

        <PlanWorkflowConfigExecution
          heading="05. Life Cycle"
          input={input}
          setInput={setInput}
        />
        <PlanWorkflowConfigWorktree
          heading="06. Worktree"
          input={input}
          setInput={setInput}
        />
        <PlanWorkflowConfigTuning
          heading="07. Run Tuning"
          input={input}
          iterationTimeoutText={iterationTimeoutText}
          setInput={setInput}
          setIterationTimeoutText={setIterationTimeoutText}
        />
      </div>
    </TabsContent>
  );
};
