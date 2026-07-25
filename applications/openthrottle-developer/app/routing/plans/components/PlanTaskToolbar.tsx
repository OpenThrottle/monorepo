import * as React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { CheckCircle, ChevronDown, PencilIcon } from 'lucide-react';
import { Link, useFetcher } from 'react-router';
import { useActionToast } from '~/global/hooks/useActionToast';
import { action } from '~/routes/plans.$planId.tasks.$taskId._index';
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
   * @description Plan the task belongs to; used for the Edit Task link target.
   */
  planId: string;
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
   * @description The task being acted on.
   */
  taskId: string;
  /**
   * @description Current task status; gates the Mark Complete control.
   */
  taskStatus?: string;
}

/**
 * @description Toolbar for the task detail route, modeled on the plan-level
 * {@link PlanToolbar}: a primary status group (Mark Complete) on the left, an
 * Actions dropdown (Edit Task) on the right, and the embedded task tag chips
 * below. Status transitions submit the route's `setTaskStatus` intent.
 */
export const PlanTaskToolbar = (
  props: PlanTaskToolbarProps,
): React.ReactElement => {
  const {
    className,
    isPromoted,
    onAddTag,
    onRemoveTag,
    planId,
    taskId,
    taskStatus,
    tags,
    tagsPending = false,
    tagVocabulary,
  } = props;

  // Hooks
  const fetcherSetStatus = useFetcher<typeof action>();

  // Setup
  const isCompleted = taskStatus === 'COMPLETED';
  const setStatusData = fetcherSetStatus.data;
  const setStatusError =
    setStatusData != null &&
    typeof setStatusData === 'object' &&
    'setTaskStatusError' in setStatusData &&
    typeof setStatusData.setTaskStatusError === 'string'
      ? setStatusData.setTaskStatusError
      : undefined;

  // Handlers

  // Markup

  // Life Cycle
  useActionToast(fetcherSetStatus.data, {
    active: fetcherSetStatus.state !== 'idle',
    error: () => setStatusError,
    id: 'set-task-status',
    success: 'Task marked complete.',
  });

  // 🔌 Short Circuit

  return (
    <OpenThrottleToolbar
      actionsMenu={
        <DropdownMenu>
          <Tooltip delayDuration={1_000}>
            <TooltipTrigger asChild={true}>
              <DropdownMenuTrigger asChild={true}>
                <Button id="task-actions-trigger" size="xs" variant="ghost">
                  {PLAN_TASK_TOOLBAR_COPY.actionsLabel}
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              {PLAN_TASK_TOOLBAR_COPY.actionsTooltip}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild={true}>
              <Link
                className="flex items-center gap-2"
                to={`/plans/${planId}/tasks/${taskId}/edit`}
              >
                <PencilIcon size={14} />
                {PLAN_TASK_TOOLBAR_COPY.editTaskLabel}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      className={className}
      dataTestId="PlanTaskToolbar"
      primaryActions={<PromoteTaskButton isPromoted={isPromoted} />}
      statusAction={
        <Tooltip delayDuration={1_000}>
          <TooltipTrigger asChild={true}>
            <fetcherSetStatus.Form method="post">
              <Input name="intent" type="hidden" value="setTaskStatus" />
              <Input name="status" type="hidden" value="COMPLETED" />
              <Button
                disabled={fetcherSetStatus.state !== 'idle' || isCompleted}
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
