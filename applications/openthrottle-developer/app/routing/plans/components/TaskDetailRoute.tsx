/**
 * @description Task-detail route body, mirroring {@link PlanDetailRoute}: a
 * heading + status badge, the shared {@link PlanTaskToolbar}, and an
 * {@link OpenThrottleTabs} shell (URL-synced on the `tab` param) with
 * Details / Output / Artifacts / Hooks tabs. The route module's default export
 * is a thin wrapper that delegates to this component for the happy path.
 */
import * as React from 'react';
import {
  Button,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { OpenThrottleTabs } from '@openthrottle/react-router-ui';
import {
  BoltIcon,
  ChevronLeftIcon,
  PackageIcon,
  TerminalSquareIcon,
  WebhookIcon,
} from 'lucide-react';
import { Link, useFetcher } from 'react-router';
import { LinkedArtifactsPanel } from '~/routing/plans/components/LinkedArtifactsPanel';
import { PlanLifecycleHooksSection } from '~/routing/plans/components/PlanLifecycleHooksSection';
import { PLAN_LIFECYCLE_HOOKS_COPY } from '~/routing/plans/data/data.copy';
import { PlanTaskToolbar } from '~/routing/plans/components/PlanTaskToolbar';
import {
  PLANS_DETAIL_TAB_SEARCH_PARAM,
  parseTaskDetailTab,
} from '~/routing/plans/utils/parsers';
import { TaskDetails } from '~/routing/plans/components/TaskDetails';
import { TaskDetailRouteHeader } from '~/routing/plans/components/TaskDetailRouteHeader';
import { TaskTabOutput } from '~/routing/plans/components/TaskTabOutput';
import {
  getPlanIsRunning,
  getPlanIsTerminal,
} from '~/routing/plans/utils/utils.plans';
import { useTaskOutputStream } from '~/routing/plans/hooks/useTaskOutputStream';
import type { Route } from '@/app/routes/+types/plans.$planId.tasks.$taskId._index';
import type { TaskDetailsFragment } from '~/__generated__/graphql';
import type { PlanTagChipData } from '~/routing/plans/components/PlanTagChips';

export interface TaskDetailRouteProps {
  readonly loaderData: Route.ComponentProps['loaderData'];
  readonly params: Route.ComponentProps['params'];
  readonly task: TaskDetailsFragment;
}

export const TaskDetailRoute = (
  props: TaskDetailRouteProps,
): React.ReactElement => {
  const { loaderData, task } = props;
  const { linkedArtifacts, plan, planOutputChunks, tagVocabulary } = loaderData;

  // Hooks
  const tagFetcher = useFetcher();

  // Setup
  const showArtifacts = false;
  const showHooks = false;
  const showToolbar = false;

  const effectivePlanId = task.planId ?? '';
  const isPromoted =
    task.status === 'SKIPPED' &&
    task.tags.some((tag: PlanTagChipData) => tag.tag === 'promoted');

  // Gate task mutations while the owning plan's run is active (QUEUED /
  // IN_PROGRESS) so Mark Complete / Promote can't fire under a live worker.
  const planIsRunning = getPlanIsRunning(plan?.status);
  // Also gate them when the owning plan is terminal (COMPLETED / CANCELED /
  // SKIPPED): there is no more work to do here, so close-out/promote a task by
  // shipping a new plan instead.
  const planIsTerminal = getPlanIsTerminal(plan?.status);

  // Task-scoped output: seed from the plan's chunks (loader) filtered by taskId,
  // then merge live deltas from the planOutputChunkAdded subscription.
  const taskOutputChunks = useTaskOutputStream(
    effectivePlanId,
    task.id,
    planOutputChunks,
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return (
    <GlobalScreen className="-max-w-5xl flex h-full w-full flex-col gap-4 p-4 md:gap-8 md:p-8 lg:gap-12 lg:p-12">
      <TaskDetailRouteHeader status={task.status ?? ''} title={task.title} />

      {showToolbar ? (
        <PlanTaskToolbar
          className="bg-card border-card-border rounded-lg border p-4"
          isPromoted={isPromoted}
          onAddTag={(tag) =>
            tagFetcher.submit({ intent: 'addTaskTag', tag }, { method: 'post' })
          }
          onRemoveTag={(tag) =>
            tagFetcher.submit(
              { intent: 'removeTaskTag', tag },
              { method: 'post' },
            )
          }
          planIsRunning={planIsRunning}
          planIsTerminal={planIsTerminal}
          tagVocabulary={tagVocabulary}
          tags={task.tags}
          tagsPending={tagFetcher.state !== 'idle'}
          taskStatus={task.status}
        />
      ) : null}

      <OpenThrottleTabs
        urlSync={{
          defaultValue: 'details',
          param: PLANS_DETAIL_TAB_SEARCH_PARAM,
          parse: (raw) => parseTaskDetailTab(raw) ?? undefined,
        }}
      >
        <TabsList
          className="mb-8 w-full max-w-full justify-start gap-4 overflow-x-auto overflow-y-hidden"
          variant="line"
        >
          <Button asChild={true} variant="outline">
            <Link to={`/plans/${effectivePlanId}?tab=tasks`}>
              <ChevronLeftIcon />
            </Link>
          </Button>

          <TabsTrigger
            className="flex-0 cursor-pointer"
            id="task-tab-details"
            value="details"
          >
            <BoltIcon />
            Task Details
          </TabsTrigger>
          <TabsTrigger
            className="flex-0 cursor-pointer"
            id="task-tab-output"
            value="output"
          >
            <TerminalSquareIcon />
            Task Output
          </TabsTrigger>

          {showArtifacts ? (
            <TabsTrigger
              className="flex-0 cursor-pointer"
              id="task-tab-artifacts"
              value="artifacts"
            >
              <PackageIcon />
              Artifacts
            </TabsTrigger>
          ) : null}

          <div className="flex-1" />
          {showHooks ? (
            <TabsTrigger
              className="flex-0 cursor-pointer"
              id="task-tab-hooks"
              value="hooks"
            >
              <WebhookIcon />
              Hooks
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="details">
          <TaskDetails planId={effectivePlanId} task={task} />
        </TabsContent>

        <TaskTabOutput chunks={taskOutputChunks} />

        {showArtifacts ? (
          <TabsContent value="artifacts">
            <LinkedArtifactsPanel artifacts={linkedArtifacts} />
          </TabsContent>
        ) : null}

        {showHooks ? (
          <TabsContent value="hooks">
            <PlanLifecycleHooksSection
              afterHooks={task.afterHooks}
              anchorTaskId={task.id}
              beforeHooks={task.beforeHooks}
              heading={PLAN_LIFECYCLE_HOOKS_COPY.taskSectionTitle}
              planId={effectivePlanId}
            />
          </TabsContent>
        ) : null}
      </OpenThrottleTabs>
    </GlobalScreen>
  );
};
