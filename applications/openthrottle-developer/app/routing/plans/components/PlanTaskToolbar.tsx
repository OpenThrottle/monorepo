import * as React from 'react';
import {
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { CheckCircle } from 'lucide-react';
import { usePlanTaskToolbar } from '~/routing/plans/hooks/usePlanTaskToolbar';
import { PLAN_TASK_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';
import { OpenThrottleToolbar } from '~/routing/plans/components/OpenThrottleToolbar';
import { PlanTagChips } from '~/routing/plans/components/PlanTagChips';
import type {
  PlanTagChipData,
  PlanTagVocabularyOption,
} from '~/routing/plans/components/PlanTagChips';
import { PromoteTaskButton } from '~/routing/plans/components/PromoteTaskButton';

export interface PlanTaskToolbarProps {
  className?: string;
  /**
   * @description True when the task has already been promoted (SKIPPED +
   * `promoted` tag); disables the Promote to Plan control.
   */
  isPromoted: boolean;
  /**
   * @description Add a tag to the task. Rendered as the PlanTagChips add control.
   */
  onAddTag: (tag: string) => void;
  /**
   * @description Remove a tag from the task. See {@link onAddTag}.
   */
  onRemoveTag: (tag: string) => void;
  /**
   * @description Whether the owning plan's run is active (QUEUED / IN_PROGRESS).
   * When true, Mark Complete and Promote to Plan are disabled with explanatory
   * tooltips so they can't fire out from under a live worker. Computed via
   * `getPlanIsRunning` from the plan status.
   */
  planIsRunning: boolean;
  /**
   * @description Whether the owning plan is in a terminal state (COMPLETED /
   * CANCELED / SKIPPED). When true, Mark Complete and Promote to Plan are
   * disabled with explanatory tooltips — there is no more work to do on a
   * finished/abandoned plan, so close-out/promote by shipping a new plan
   * instead. Computed via `getPlanIsTerminal` from the plan status.
   */
  planIsTerminal: boolean;
  /**
   * @description Available tag vocabulary for the add-tag dropdown.
   */
  tagVocabulary: PlanTagVocabularyOption[];
  /**
   * @description Applied task tags rendered as chips.
   */
  tags: PlanTagChipData[];
  /**
   * @description Whether a tag add/remove is in flight (disables tag controls).
   */
  tagsPending?: boolean;
  /**
   * @description Current task status; gates the Mark Complete control.
   */
  taskStatus?: string;
}

/**
 * @description Toolbar for the task detail route, modeled on the plan-level
 * {@link PlanToolbar}: a primary status group (Mark Complete) on the left,
 * Promote to Plan on the right, and the embedded task tag chips below. Status
 * transitions submit the route's `setTaskStatus` intent. There is no actions
 * menu — tasks are edited through the OpenThrottle MCP, not from here.
 */
export const PlanTaskToolbar = (
  props: PlanTaskToolbarProps,
): React.ReactElement => {
  const {
    className,
    isPromoted,
    onAddTag,
    onRemoveTag,
    planIsRunning,
    planIsTerminal,
    taskStatus,
    tags,
    tagsPending = false,
    tagVocabulary,
  } = props;

  // Hooks
  const { fetcherSetStatus, isCompleted } = usePlanTaskToolbar({ taskStatus });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleToolbar
      className={className}
      dataTestId="PlanTaskToolbar"
      primaryActions={
        <PromoteTaskButton
          isPromoted={isPromoted}
          planIsRunning={planIsRunning}
          planIsTerminal={planIsTerminal}
        />
      }
      statusAction={
        <Tooltip delayDuration={1_000}>
          <TooltipTrigger asChild={true}>
            <fetcherSetStatus.Form method="post">
              <Input name="intent" type="hidden" value="setTaskStatus" />
              <Input name="status" type="hidden" value="COMPLETED" />
              <Button
                disabled={
                  fetcherSetStatus.state !== 'idle' ||
                  isCompleted ||
                  planIsRunning ||
                  planIsTerminal
                }
                size="xs"
                type="submit"
                variant="ghost"
              >
                <CheckCircle />
                {fetcherSetStatus.state !== 'idle'
                  ? 'Marking…'
                  : 'Mark Complete'}
              </Button>
            </fetcherSetStatus.Form>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isCompleted
              ? 'Task is already completed'
              : planIsTerminal
                ? PLAN_TASK_TOOLBAR_COPY.markCompleteTerminalTooltip
                : planIsRunning
                  ? PLAN_TASK_TOOLBAR_COPY.markCompleteRunningTooltip
                  : 'Mark this task as completed'}
          </TooltipContent>
        </Tooltip>
      }
      tags={
        <PlanTagChips
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          pending={tagsPending}
          tags={tags}
          vocabulary={tagVocabulary}
        />
      }
    />
  );
};
