import * as React from 'react';
import { Link } from 'react-router';
import { OpenThrottleToolbar } from '~/routing/plans/components/OpenThrottleToolbar';
import { PlanToolbarEditorLinks } from '~/routing/plans/components/PlanToolbarEditorLinks';
import { PlanToolbarTags } from '~/routing/plans/components/PlanToolbarTags';
import type {
  PlanTagChipData,
  PlanTagVocabularyOption,
} from '~/routing/plans/components/PlanTagChips';
import { PlanToolbarActionsMenu } from '~/routing/plans/components/PlanToolbarActionsMenu';
import { PlanToolbarRunActions } from '~/routing/plans/components/PlanToolbarRunActions';
import { PlanToolbarStatusAction } from '~/routing/plans/components/PlanToolbarStatusAction';
import { usePlanToolbar } from '~/routing/plans/hooks/usePlanToolbar';
import type { WorkspaceEditorId } from '~/__generated__/graphql';

export interface PlanToolbarProps {
  /**
   * @description REQUIRED git branch the run operates on, submitted to the enqueuePlanRun mutation.
   */
  branch?: string;
  /**
   * @description Optional registered checkout id, submitted to the enqueuePlanRun mutation.
   */
  checkoutId?: string;
  className?: string;
  /**
   * @description Absolute path the editor deep links open. Separate from
   * {@link workingDirectory} (submitted to enqueuePlanRun, so it must stay what
   * the user configured): this one may fall back to the selected checkout.
   */
  editorWorkingDirectory?: string;
  /**
   * @description Editors enabled in workspace settings, as the loader's deferred
   * promise; empty renders none. Deep links are a convenience, so they get their
   * own boundary rather than holding up the toolbar's Run/Queue controls.
   */
  editors?: Promise<readonly WorkspaceEditorId[]>;
  /**
   * @description JSON `{ hooks: [...] }` for enqueuePlanRun; empty when no hooks or invalid.
   */
  jobRunHooksJson?: string;
  /**
   * @description Whether the plan's newest run is stale — its owning process crashed hard and its
   * heartbeat went quiet past the cutoff. When true the Kill control is replaced by a 'Stale'
   * badge: the run is already dead, so Kill cannot work; a sweeper will settle it.
   */
  /**
   * `undefined` means the deferred run history has not resolved yet: render no
   * badge at all rather than asserting "not stale", which we cannot yet know.
   */
  newestRunIsStale?: boolean | undefined;
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
  /** @description Tag vocabulary for the add-tag dropdown. See {@link onAddTag}. */
  tagVocabulary?: Promise<PlanTagVocabularyOption[]>;
  /** @description Applied plan tags rendered as chips. See {@link onAddTag}. */
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
 * editor deep links, and Add Task / Edit Plan (actions menu). Uses shadcn
 * Button, Tooltip, and DropdownMenu. The deep links get `OpenThrottleToolbar`'s
 * dedicated `editorActions` slot rather than sharing `utilityContent`.
 */
export const PlanToolbar = (props: PlanToolbarProps): React.ReactElement => {
  const {
    branch,
    className,
    editorWorkingDirectory = '',
    editors,
    newestRunIsStale,
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
  const {
    fetcherEvaluateRules,
    fetcherRunPlan,
    fetcherSetPlanStatus,
    isCompleted,
    isRunning,
    isTerminal,
  } = usePlanToolbar({ planStatus, workingDirectory });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleToolbar
      actionsMenu={<PlanToolbarActionsMenu planId={planId} />}
      className={className}
      dataTestId="PlanToolbar"
      editorActions={
        <PlanToolbarEditorLinks
          editors={editors}
          planId={planId}
          workingDirectory={editorWorkingDirectory}
        />
      }
      primaryActions={
        <PlanToolbarRunActions
          branch={branch}
          checkoutId={checkoutId}
          fetcherEvaluateRules={fetcherEvaluateRules}
          fetcherRunPlan={fetcherRunPlan}
          isRunning={isRunning}
          isTerminal={isTerminal}
          jobRunHooksJson={jobRunHooksJson}
          newestRunIsStale={newestRunIsStale}
          planId={planId}
          planStatus={planStatus}
          planTitle={planTitle}
          ralphTuningJson={ralphTuningJson}
          repositoryId={repositoryId}
          workflowRunBlocked={workflowRunBlocked}
          workflowRunBlockedReason={workflowRunBlockedReason}
          workingDirectory={workingDirectory}
        />
      }
      statusAction={
        <PlanToolbarStatusAction
          fetcherSetPlanStatus={fetcherSetPlanStatus}
          isCompleted={isCompleted}
          isRunning={isRunning}
          planId={planId}
        />
      }
      tags={
        <PlanToolbarTags
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          pending={tagsPending}
          tags={tags}
          vocabulary={tagVocabulary}
        />
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
