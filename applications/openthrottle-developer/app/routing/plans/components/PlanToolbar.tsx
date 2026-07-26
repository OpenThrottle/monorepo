import * as React from 'react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import {
  CheckCircle,
  ChevronDown,
  Gauge,
  PencilIcon,
  PlayCircle,
  PlusCircle,
} from 'lucide-react';
import { Link, useFetcher } from 'react-router';
import { useActionToast } from '~/global/hooks/useActionToast';
import { action } from '~/routes/plans.$planId._index';
import { KillPlanRunButton } from '~/routing/plans/components/KillPlanRunButton';
import { OpenThrottleToolbar } from '~/routing/plans/components/OpenThrottleToolbar';
import { PlanTagChips } from '~/routing/plans/components/PlanTagChips';
import type {
  PlanTagChipData,
  PlanTagVocabularyOption,
} from '~/routing/plans/components/PlanTagChips';
import {
  PLAN_RUN_BULLMQ_QUEUE_NAME,
  planRunJobDetailPath,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import { getPlanIsCancelable } from '~/routing/plans/utils/utils.plans';
import { addRecentWorkspacePath } from '~/routing/plans/utils/workspace-path';

export interface PlanToolbarProps {
  /**
   * @description Optional registered checkout id, submitted to the enqueuePlanRun mutation.
   */
  checkoutId?: string;
  className?: string;
  /**
   * @description JSON `{ hooks: [...] }` for enqueuePlanRun; empty when no hooks or invalid.
   */
  jobRunHooksJson?: string;
  /**
   * @description Whether the plan's newest run is stale — its owning process crashed hard and its
   * heartbeat went quiet past the cutoff. When true the Kill control is replaced by a 'Stale'
   * badge: the run is already dead, so Kill cannot work; a sweeper will settle it.
   */
  newestRunIsStale?: boolean;
  /**
   * @description Add a plan tag. When provided alongside {@link onRemoveTag},
   * {@link tags}, and {@link tagVocabulary}, the toolbar renders the tag chips.
   */
  onAddTag?: (tag: string) => void;
  /**
   * @description Remove a plan tag. See {@link onAddTag}.
   */
  onRemoveTag?: (tag: string) => void;
  planId: string;
  planStatus?: string;
  /**
   * @description Display title for Kill run confirmation (defaults when omitted).
   */
  planTitle?: string;
  /**
   * @description JSON-serialized GraphQL Ralph tuning input for enqueuePlanRun, or empty when defaults only.
   */
  ralphTuningJson?: string;
  /**
   * @description Optional registered repository id, submitted to the enqueuePlanRun mutation.
   */
  repositoryId?: string;
  /**
   * @description Available tag vocabulary for the add-tag dropdown. See {@link onAddTag}.
   */
  tagVocabulary?: PlanTagVocabularyOption[];
  /**
   * @description Applied plan tags rendered as chips. See {@link onAddTag}.
   */
  tags?: PlanTagChipData[];
  /**
   * @description Whether a tag add/remove is in flight (disables tag controls).
   */
  tagsPending?: boolean;
  /**
   * @description When true, queue/run is disabled (e.g. workflow-ralph option validation failed on the plan).
   */
  workflowRunBlocked?: boolean;
  /**
   * @description First validation message for tooltip when {@link workflowRunBlocked} is true.
   */
  workflowRunBlockedReason?: string;
  /**
   * @description Optional absolute path to a local project directory for multi-workspace runs.
   * Passed through to the enqueuePlanRun mutation as workingDirectory.
   */
  workingDirectory?: string;
}

/**
 * @description Toolbar for plan actions: Mark Complete, Run/Queue (status group),
 * and Add Task / Edit Plan (actions menu). Uses shadcn Button, Tooltip, and DropdownMenu.
 */
export const PlanToolbar = (props: PlanToolbarProps): React.ReactElement => {
  const {
    className,
    newestRunIsStale = false,
    onAddTag,
    onRemoveTag,
    planId,
    planTitle = 'Untitled',
    planStatus,
    jobRunHooksJson = '',
    ralphTuningJson = '',
    tags,
    tagsPending = false,
    tagVocabulary,
    checkoutId,
    repositoryId,
    workingDirectory,
    workflowRunBlocked = false,
    workflowRunBlockedReason,
  } = props;

  // Hooks
  const fetcherEvaluateRules = useFetcher<typeof action>();
  const fetcherRunPlan = useFetcher<typeof action>();
  const fetcherSetPlanStatus = useFetcher<typeof action>();
  const runPlanWasBusy = React.useRef(false);

  // Setup
  const isCompleted = planStatus === 'COMPLETED';
  const setPlanStatusData = fetcherSetPlanStatus.data;
  const setPlanStatusError =
    setPlanStatusData != null &&
    typeof setPlanStatusData === 'object' &&
    'setPlanStatusError' in setPlanStatusData &&
    typeof setPlanStatusData.setPlanStatusError === 'string'
      ? setPlanStatusData.setPlanStatusError
      : undefined;

  const runPlanData = fetcherRunPlan.data;
  const runPlanError =
    runPlanData != null &&
    typeof runPlanData === 'object' &&
    'runPlanError' in runPlanData &&
    typeof runPlanData.runPlanError === 'string'
      ? runPlanData.runPlanError
      : undefined;

  const evaluateRulesData = fetcherEvaluateRules.data;
  const evaluateRulesError =
    evaluateRulesData != null &&
    typeof evaluateRulesData === 'object' &&
    'evaluatePlanRulesError' in evaluateRulesData &&
    typeof evaluateRulesData.evaluatePlanRulesError === 'string'
      ? evaluateRulesData.evaluatePlanRulesError
      : undefined;

  const getRunButtonLabel = (): string => {
    switch (planStatus) {
      case 'COMPLETED':
        return 'Completed';
      case 'IN_PROGRESS':
        return 'In progress';
      case 'PENDING':
        return 'Add to Queue';
      case 'QUEUED':
        return 'Queued';
      case 'SKIPPED':
        return 'Skipped';

      default:
        return 'Run plan';
    }
  };

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const busy = fetcherRunPlan.state !== 'idle';

    if (runPlanWasBusy.current && !busy) {
      const data = fetcherRunPlan.data;

      if (data != null && typeof data === 'object') {
        if ('runPlan' in data && data.runPlan != null) {
          const run = data.runPlan;
          const jobId =
            run != null &&
            typeof run === 'object' &&
            'jobId' in run &&
            typeof run.jobId === 'string'
              ? run.jobId
              : null;

          if (workingDirectory != null && workingDirectory.trim() !== '') {
            addRecentWorkspacePath(workingDirectory.trim());
          }

          if (jobId != null && jobId !== '') {
            toast.success('Plan run queued', {
              description: `Job ${jobId}. Queue ${PLAN_RUN_BULLMQ_QUEUE_NAME}: ${planRunJobDetailPath(jobId)}`,
            });
          } else {
            toast.success(
              'Plan run queued. The worker uses tuning from Workflow run options (defaults apply when the panel is collapsed).',
            );
          }
        }
      }
    }

    runPlanWasBusy.current = busy;

    // 🪝 ...
  }, [fetcherRunPlan.state, fetcherRunPlan.data]);

  useActionToast(fetcherSetPlanStatus.data, {
    active: fetcherSetPlanStatus.state !== 'idle',
    error: () => setPlanStatusError,
    id: 'set-plan-status',
    success: 'Plan marked complete.',
  });

  useActionToast(fetcherRunPlan.data, {
    active: fetcherRunPlan.state !== 'idle',
    error: () => runPlanError,
    id: 'run-plan',
  });

  useActionToast(fetcherEvaluateRules.data, {
    active: fetcherEvaluateRules.state !== 'idle',
    error: () => evaluateRulesError,
    id: 'evaluate-plan-rules',
    success: 'Rules evaluation queued',
  });

  // 🔌 Short Circuit

  return (
    <OpenThrottleToolbar
      actionsMenu={
        <DropdownMenu>
          <Tooltip delayDuration={1_000}>
            <TooltipTrigger asChild={true}>
              <DropdownMenuTrigger asChild={true}>
                <Button id="plan-actions-trigger" size="xs" variant="ghost">
                  Actions
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Add task or edit plan</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild={true}>
              <Link
                className="flex items-center gap-2"
                to={`/plans/${planId}/tasks/create`}
              >
                <PlusCircle size={14} />
                Add Task
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild={true}>
              <Link
                className="flex items-center gap-2"
                to={`/plans/${planId}/edit`}
              >
                <PencilIcon size={14} />
                Edit Plan
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      className={className}
      dataTestId="PlanToolbar"
      primaryActions={
        <>
          <Tooltip delayDuration={1_000}>
            <TooltipTrigger asChild={true}>
              <fetcherRunPlan.Form method="post">
                <Input name="intent" type="hidden" value="runPlan" />
                <Input
                  name="ralphTuning"
                  type="hidden"
                  value={ralphTuningJson}
                />
                {jobRunHooksJson !== '' ? (
                  <Input
                    name="jobRunHooksJson"
                    type="hidden"
                    value={jobRunHooksJson}
                  />
                ) : null}
                {workingDirectory != null && workingDirectory !== '' && (
                  <Input
                    name="workingDirectory"
                    type="hidden"
                    value={workingDirectory}
                  />
                )}
                {checkoutId != null && checkoutId !== '' && (
                  <Input name="checkoutId" type="hidden" value={checkoutId} />
                )}
                {repositoryId != null && repositoryId !== '' && (
                  <Input
                    name="repositoryId"
                    type="hidden"
                    value={repositoryId}
                  />
                )}
                <Button
                  disabled={
                    fetcherRunPlan.state !== 'idle' || workflowRunBlocked
                  }
                  size="xs"
                  type="submit"
                  variant="ghost"
                >
                  <PlayCircle />
                  {getRunButtonLabel()}
                </Button>
              </fetcherRunPlan.Form>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="top">
              {fetcherRunPlan.state !== 'idle'
                ? 'Submitting…'
                : workflowRunBlocked
                  ? (workflowRunBlockedReason ??
                    'Fix workflow run options in Configuration (aligned with workflow-ralph argv).')
                  : 'Enqueue a worker run for this plan using tuning from Workflow run options (defaults apply if you have not changed them).'}
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={1_000}>
            <TooltipTrigger asChild={true}>
              <fetcherEvaluateRules.Form method="post">
                <Input name="intent" type="hidden" value="evaluatePlanRules" />
                <Input name="planId" type="hidden" value={planId} />
                <Button
                  disabled={fetcherEvaluateRules.state !== 'idle'}
                  size="xs"
                  type="submit"
                  variant="ghost"
                >
                  <Gauge />
                  {fetcherEvaluateRules.state !== 'idle'
                    ? 'Evaluating…'
                    : 'Evaluate rules'}
                </Button>
              </fetcherEvaluateRules.Form>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="top">
              Queue a tag→action rules evaluation pass for this plan (recomputes
              skills-via-rules; results appear in the rule applications ledger).
            </TooltipContent>
          </Tooltip>

          {getPlanIsCancelable(planStatus) && newestRunIsStale ? (
            <Tooltip delayDuration={1_000}>
              <TooltipTrigger asChild={true}>
                <Badge color="amber" size="xs">
                  Stale
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs" side="top">
                This run lost contact (its heartbeat went quiet) — the owning
                process likely crashed. Kill is unavailable because there is
                nothing live to stop; a background sweeper will settle it.
              </TooltipContent>
            </Tooltip>
          ) : (
            <KillPlanRunButton
              planId={planId}
              planTitle={planTitle}
              show={getPlanIsCancelable(planStatus)}
              size="xs"
            />
          )}
        </>
      }
      statusAction={
        <Tooltip delayDuration={1_000}>
          <TooltipTrigger asChild={true}>
            <fetcherSetPlanStatus.Form method="post">
              <Input name="intent" type="hidden" value="setPlanStatus" />
              <Input name="planId" type="hidden" value={planId} />
              <Input name="status" type="hidden" value="COMPLETED" />
              <Button
                disabled={fetcherSetPlanStatus.state !== 'idle' || isCompleted}
                size="xs"
                type="submit"
                variant="ghost"
              >
                <CheckCircle />
                {fetcherSetPlanStatus.state !== 'idle'
                  ? 'Marking…'
                  : 'Mark Complete'}
              </Button>
            </fetcherSetPlanStatus.Form>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isCompleted
              ? 'Plan is already completed'
              : 'Mark this plan as completed'}
          </TooltipContent>
        </Tooltip>
      }
      tags={
        onAddTag != null &&
        onRemoveTag != null &&
        tags != null &&
        tagVocabulary != null ? (
          <PlanTagChips
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            pending={tagsPending}
            tags={tags}
            vocabulary={tagVocabulary}
          />
        ) : null
      }
      utilityContent={
        <Link
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
          to="#plan-workflow-run-transparency"
        >
          CLI preview and history
        </Link>
      }
    />
  );
};
