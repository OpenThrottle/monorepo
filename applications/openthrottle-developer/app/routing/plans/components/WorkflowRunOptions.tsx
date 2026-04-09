import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { ChevronUp } from 'lucide-react';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
  buildWorkflowRalphOptionArgs,
  formatWorkflowRalphCommandLine,
  getDefaultWorkflowRalphRunOptionsInput,
  isUuid,
  parseWorkflowRunIterationTimeoutSeconds,
  type WorkflowRalphDebugCli,
  type WorkflowRalphRunOptionsInput,
  type WorkflowRalphTargetMode,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

/**
 * @description Workflow-ralph CLI options (`--plan` / `--task` and tuning flags)
 * with canonical preview/copy. When the parent controls state (plan detail), the
 * same values are serialized for `enqueuePlanRun` (tuning only; queue is always plan-scoped).
 */
export interface WorkflowRunOptionsProps {
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

export const WorkflowRunOptions = (props: WorkflowRunOptionsProps) => {
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
  const [internalInput, setInternalInput] =
    React.useState<WorkflowRalphRunOptionsInput>(() =>
      getDefaultWorkflowRalphRunOptionsInput({ planId, taskId }),
    );
  const [internalIterationTimeoutText, setInternalIterationTimeoutText] =
    React.useState('');

  const isControlled =
    valueProp !== undefined &&
    onValueChange !== undefined &&
    iterationTimeoutTextProp !== undefined &&
    onIterationTimeoutTextChange !== undefined;

  const input = isControlled ? valueProp : internalInput;
  const setInput = isControlled
    ? (updater: React.SetStateAction<WorkflowRalphRunOptionsInput>) => {
        const next =
          typeof updater === 'function' ? updater(valueProp) : updater;
        onValueChange(next);
      }
    : setInternalInput;

  const iterationTimeoutText = isControlled
    ? iterationTimeoutTextProp
    : internalIterationTimeoutText;
  const setIterationTimeoutText = isControlled
    ? onIterationTimeoutTextChange
    : setInternalIterationTimeoutText;

  // Setup
  const isPlanMode = input.targetMode === 'plan';
  const isTaskMode = input.targetMode === 'task';

  const activePlanId = isPlanMode ? input.planId.trim() : '';
  const activeTaskId = isTaskMode ? input.taskId.trim() : '';

  const targetIdWarning = isPlanMode
    ? activePlanId !== '' && !isUuid(activePlanId)
    : activeTaskId !== '' && !isUuid(activeTaskId);

  const mergedForArgv: WorkflowRalphRunOptionsInput = {
    ...input,
    iterationTimeoutSeconds:
      parseWorkflowRunIterationTimeoutSeconds(iterationTimeoutText),
  };

  const optionArgs = buildWorkflowRalphOptionArgs(mergedForArgv);
  const canonicalCommandLine = formatWorkflowRalphCommandLine(optionArgs);

  // Handlers
  const handleTargetModeChange = (value: WorkflowRalphTargetMode): void => {
    setInput((prev) => ({ ...prev, targetMode: value }));
  };

  const handleDebugChange = (value: WorkflowRalphDebugCli): void => {
    setInput((prev) => ({ ...prev, debugCli: value }));
  };

  const handleIterationsBlur = (): void => {
    if (input.iterations < 1 || Number.isNaN(input.iterations)) {
      setInput((prev) => ({
        ...prev,
        iterations: DEFAULT_RALPH_ITERATIONS,
      }));
    }
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (isControlled) return;

    setInternalInput(
      getDefaultWorkflowRalphRunOptionsInput({ planId, taskId }),
    );
  }, [isControlled, planId, taskId]);

  // 🔌 Short Circuit

  return (
    <Card className={classnames(className)} data-testid="WorkflowRunOptions">
      <CardHeader className="pb-2 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <h2
              className="text-lg font-semibold leading-none tracking-tight"
              id="workflow-run-options-title"
            >
              Workflow options
            </h2>
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
        <fieldset
          aria-labelledby="workflow-run-target-legend"
          className="space-y-3 rounded-md border border-border p-4"
        >
          <legend
            className="px-1 text-sm font-medium text-foreground"
            id="workflow-run-target-legend"
          >
            Run target
          </legend>
          <p className="text-muted-foreground text-xs">
            For the CLI preview: one of <code className="text-xs">--plan</code>{' '}
            or <code className="text-xs">--task</code>. Queued runs always
            target this plan; switching to task mode here only changes the
            preview and copyable command, not the BullMQ job.
          </p>
          <div className="space-y-2">
            <Label htmlFor="workflow-run-target-mode">Target mode</Label>
            <Select
              onValueChange={(v) => {
                if (v === 'plan' || v === 'task') {
                  handleTargetModeChange(v);
                }
              }}
              value={input.targetMode}
            >
              <SelectTrigger
                aria-label="Run target: plan or task"
                className="max-w-md"
                id="workflow-run-target-mode"
              >
                <SelectValue placeholder="Target mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plan">Plan (--plan)</SelectItem>
                <SelectItem value="task">Task (--task)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {input.targetMode === 'plan' ? (
            <div className="space-y-2">
              <Label htmlFor="workflow-run-plan-id">--plan</Label>
              <Input
                aria-describedby="workflow-run-plan-id-hint"
                aria-label="Plan UUID for --plan"
                autoComplete="off"
                data-testid="workflow-run-plan-id-input"
                id="workflow-run-plan-id"
                onChange={(e) =>
                  setInput((prev) => ({ ...prev, planId: e.target.value }))
                }
                placeholder="Plan UUID"
                spellCheck={false}
                value={input.planId}
              />
              <p
                className="text-muted-foreground text-xs"
                id="workflow-run-plan-id-hint"
              >
                Example: 77cb14a0-5eb0-4061-87ea-d618b85e8818
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="workflow-run-task-id">--task</Label>
              <Input
                aria-describedby="workflow-run-task-id-hint"
                aria-label="Task UUID for --task"
                autoComplete="off"
                data-testid="workflow-run-task-id-input"
                id="workflow-run-task-id"
                onChange={(e) =>
                  setInput((prev) => ({ ...prev, taskId: e.target.value }))
                }
                placeholder="Task UUID"
                spellCheck={false}
                value={input.taskId}
              />
              <p
                className="text-muted-foreground text-xs"
                id="workflow-run-task-id-hint"
              >
                Example: 45a30762-92a9-42f4-90e0-2437c7ef26a8
              </p>
            </div>
          )}

          {targetIdWarning ? (
            <p className="text-destructive text-xs" role="alert">
              Value does not match a UUID (v4) pattern; CLI validation may fail.
            </p>
          ) : null}
        </fieldset>

        <fieldset
          aria-labelledby="workflow-run-layer1-legend"
          className="space-y-3 rounded-md border border-border p-4"
        >
          <legend
            className="px-1 text-sm font-medium text-foreground"
            id="workflow-run-layer1-legend"
          >
            Layer 1 — Prompt profile
          </legend>
          <p className="text-muted-foreground text-xs">
            How the model should approach the work (Cursor command or prompt
            path). Default matches CLI:{' '}
            <code className="text-xs">{DEFAULT_RALPH_PROMPT}</code>.
          </p>
          <div className="space-y-2">
            <Label htmlFor="workflow-run-prompt">--prompt</Label>
            <Input
              aria-describedby="workflow-run-prompt-hint"
              aria-label="Prompt profile for --prompt"
              autoComplete="off"
              id="workflow-run-prompt"
              onChange={(e) =>
                setInput((prev) => ({ ...prev, prompt: e.target.value }))
              }
              placeholder={DEFAULT_RALPH_PROMPT}
              spellCheck={false}
              value={input.prompt}
            />
            <p
              className="text-muted-foreground text-xs"
              id="workflow-run-prompt-hint"
            >
              Omitted from the command when equal to the default.
            </p>
          </div>
        </fieldset>

        <fieldset
          aria-labelledby="workflow-run-layer2-legend"
          className="space-y-3 rounded-md border border-border p-4"
          disabled={true} // FIXME: When we have runners remove this
        >
          <legend
            className="px-1 text-sm font-medium text-foreground"
            id="workflow-run-layer2-legend"
          >
            Layer 2 — Execution backend
          </legend>
          <p className="text-muted-foreground text-xs">
            Which runner executes each iteration (UI-only stub; no CLI flag
            yet). Phase 2 will add runner selection when the workflow exposes
            it.
          </p>
          <div className="space-y-2">
            <Label htmlFor="workflow-run-backend">Runner</Label>
            <Select disabled={true} value="cursor">
              <SelectTrigger
                aria-label="Execution backend (stub)"
                className="max-w-md"
                id="workflow-run-backend"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cursor">Cursor (current)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </fieldset>

        <fieldset
          aria-labelledby="workflow-run-layer3-legend"
          className="space-y-3 rounded-md border border-border p-4"
        >
          <legend
            className="px-1 text-sm font-medium text-foreground"
            id="workflow-run-layer3-legend"
          >
            Layer 3 — Run tuning
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workflow-run-iterations">--iterations</Label>
              <Input
                aria-describedby="workflow-run-iterations-hint"
                aria-label="Iteration count for --iterations"
                id="workflow-run-iterations"
                min={1}
                onBlur={handleIterationsBlur}
                onChange={(e) => {
                  const raw = e.target.valueAsNumber;
                  if (!Number.isNaN(raw) && raw >= 1) {
                    setInput((prev) => ({
                      ...prev,
                      iterations: Math.floor(raw),
                    }));
                  }
                }}
                type="number"
                value={input.iterations}
              />
              <p
                className="text-muted-foreground text-xs"
                id="workflow-run-iterations-hint"
              >
                Default {DEFAULT_RALPH_ITERATIONS}; omitted when default.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflow-run-iteration-timeout">
                --iteration-timeout (seconds)
              </Label>
              <Input
                aria-describedby="workflow-run-iteration-timeout-hint"
                aria-label="Per-iteration timeout in seconds for --iteration-timeout"
                autoComplete="off"
                id="workflow-run-iteration-timeout"
                inputMode="numeric"
                onChange={(e) => setIterationTimeoutText(e.target.value)}
                placeholder="e.g. 1800"
                value={iterationTimeoutText}
              />
              <p
                className="text-muted-foreground text-xs"
                id="workflow-run-iteration-timeout-hint"
              >
                Non-interactive only; empty omits the flag.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflow-run-model">--model</Label>
              <Input
                aria-describedby="workflow-run-model-hint"
                aria-label="Cursor model for --model"
                autoComplete="off"
                id="workflow-run-model"
                onChange={(e) =>
                  setInput((prev) => ({ ...prev, model: e.target.value }))
                }
                placeholder={DEFAULT_RALPH_MODEL}
                spellCheck={false}
                value={input.model}
              />
              <p
                className="text-muted-foreground text-xs"
                id="workflow-run-model-hint"
              >
                Cursor model preset; default &apos;
                {DEFAULT_RALPH_MODEL}
                &apos; is omitted.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflow-run-project">--project</Label>
              <Input
                aria-describedby="workflow-run-project-hint"
                aria-label="NX project name for --project"
                autoComplete="off"
                id="workflow-run-project"
                onChange={(e) =>
                  setInput((prev) => ({ ...prev, project: e.target.value }))
                }
                placeholder="NX project name"
                spellCheck={false}
                value={input.project}
              />
              <p
                className="text-muted-foreground text-xs"
                id="workflow-run-project-hint"
              >
                From the Nx project graph; empty omits the flag.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="workflow-run-debug">Debug / verbose</Label>
            <Select
              onValueChange={(v) => {
                if (v === 'omit' || v === 'debug' || v === 'verbose') {
                  handleDebugChange(v);
                }
              }}
              value={input.debugCli}
            >
              <SelectTrigger
                aria-describedby="workflow-run-debug-hint"
                className="max-w-md"
                id="workflow-run-debug"
              >
                <SelectValue placeholder="Shim debug" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="omit">
                  Default (no CLI flags; use env if set)
                </SelectItem>
                <SelectItem value="debug">--debug</SelectItem>
                <SelectItem value="verbose">--verbose</SelectItem>
              </SelectContent>
            </Select>
            <p
              className="text-muted-foreground text-xs"
              id="workflow-run-debug-hint"
            >
              CLI flags override WORKFLOW_RALPH_DEBUG / RALPH_DEBUG for this
              run.
            </p>
          </div>
        </fieldset>

        <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <Label htmlFor="workflow-run-preview">
              Canonical CLI (preview)
            </Label>
            <OpenThrottleClipboard
              className="text-primary hover:text-primary/90 text-sm font-medium underline underline-offset-4"
              label="Copy canonical command"
              text={canonicalCommandLine}
            />
          </div>
          <pre
            className="bg-muted max-h-40 overflow-x-auto overflow-y-auto rounded-md p-3 text-xs leading-relaxed"
            data-testid="workflow-run-cli-preview"
            id="workflow-run-preview"
          >
            {canonicalCommandLine}
          </pre>
          <p className="text-muted-foreground text-xs" role="note">
            <span className="font-medium text-foreground">Toolbar queue:</span>{' '}
            Run / Add to Queue uses the tuning fields in this section (or
            defaults if you have not changed them). The worker always runs this
            plan; <code className="mx-0.5 text-[0.7rem]">--task</code> in the
            preview is for local CLI only. Copy the command above to match a
            manual run.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
