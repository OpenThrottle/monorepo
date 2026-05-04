import * as React from 'react';
import { useAtom } from 'jotai';
import classnames from 'classnames';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@openthrottle/react-router-shadcn';
import { ChevronUp, TerminalSquareIcon } from 'lucide-react';
import {
  buildWorkflowRalphOptionArgs,
  formatWorkflowRalphCommandLine,
  getDefaultWorkflowRalphRunOptionsInput,
  parseWorkflowRunIterationTimeoutSeconds,
  type WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import { PlanWorkflowCommand } from '~/routing/plans/components/PlanWorkflowCommand';
import { PlanWorkflowConfigExecution } from '~/routing/plans/components/PlanWorkflowConfigExecution';
import { PlanWorkflowConfigPrompt } from '~/routing/plans/components/PlanWorkflowConfigPrompt';
import { PlanWorkflowConfigTarget } from '~/routing/plans/components/PlanWorkflowConfigTarget';
import { PlanWorkflowConfigTuning } from '~/routing/plans/components/PlanWorkflowConfigTuning';
import {
  workflowRalphRunOptionsAtom,
  workflowRunIterationTimeoutTextAtom,
} from '~/routing/plans/data/atom.plan';

/**
 * @description Workflow-ralph CLI options (`--plan` / `--task` and tuning flags)
 * with canonical preview/copy. When the parent controls state (plan detail), the
 * same values are serialized for `enqueuePlanRun` (tuning only; queue is always plan-scoped).
 */
export interface PlanWorkflowConfigProps {
  readonly className?: string;
  readonly iterationTimeoutText?: string;

  /**
   * @description When set (plan detail URL-driven panel), shows a control to collapse the section.
   */
  readonly onCollapse?: () => void;
  readonly onIterationTimeoutTextChange?: (next: string) => void;
  readonly onValueChange?: (next: WorkflowRalphRunOptionsInput) => void;

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
}

export const PlanWorkflowConfig = (props: PlanWorkflowConfigProps) => {
  const {
    className,
    iterationTimeoutText: iterationTimeoutTextProp,
    onCollapse,
    onIterationTimeoutTextChange,
    onResetToDefaults,
    onValueChange,
    planId,
    taskId,
    value: valueProp,
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
    <Card className={classnames(className)} data-testid="PlanWorkflowConfig">
      <CardHeader className="pb-2 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-4">
              <TerminalSquareIcon className="size-6" />
              <h2
                className="text-lg font-semibold leading-none tracking-tight"
                id="workflow-run-options-title"
              >
                Workflow Configuration
              </h2>
            </div>
            <CardDescription>
              Compose flags aligned with{' '}
              <code className="text-xs">pnpm exec workflow-ralph --help</code>{' '}
              and{' '}
              <span className="text-xs">
                docs/workflows/ralph-workflow-runtime-config.md
              </span>
              . The toolbar action that enqueues a run sends the same tuning
              (iterations, model, prompt profile, project, debug CLI, iteration
              timeout) to the worker; unchanged fields use CLI defaults.
            </CardDescription>
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

              {onCollapse != null ? (
                <Button
                  aria-controls="workflow-run-options"
                  aria-expanded={true}
                  aria-label="Hide workflow run options"
                  className="shrink-0 size-8"
                  onClick={onCollapse}
                  variant="ghost"
                >
                  <ChevronUp aria-hidden={true} className="size-4" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-4">
        <PlanWorkflowConfigTarget input={input} setInput={setInput} />

        <PlanWorkflowConfigPrompt
          onPromptChange={(next) =>
            setInput((prev) => ({ ...prev, prompt: next }))
          }
          prompt={input.prompt}
        />

        <PlanWorkflowConfigExecution />

        <PlanWorkflowConfigTuning
          input={input}
          iterationTimeoutText={iterationTimeoutText}
          setInput={setInput}
          setIterationTimeoutText={setIterationTimeoutText}
        />

        <PlanWorkflowCommand
          canonicalCommandLineOverride={canonicalCommandLineOverride}
        />
      </CardContent>
    </Card>
  );
};
