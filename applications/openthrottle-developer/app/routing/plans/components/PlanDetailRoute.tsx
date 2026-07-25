/**
 * @description Plan-detail route body. Rendered inside {@link PlanRunConfigStoreProvider}
 * so it (and the tabs/toolbar below it) read the route-scoped run-config atoms directly.
 * The route module's default export is a thin Provider wrapper around this component —
 * a component cannot consume a Jotai Provider it renders in its own JSX, so the body
 * lives here. Extracted from `routes/plans.$planId._index.tsx`; behavior is unchanged.
 */
import * as React from 'react';
import {
  Badge,
  Card,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import {
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { useKeyboardShortcut } from '@openthrottle/react-router-utils';
import { useAtomValue } from 'jotai';
import { Link, useFetcher, useNavigate, useSearchParams } from 'react-router';
import {
  BoltIcon,
  CogIcon,
  LayoutListIcon,
  NotebookTextIcon,
  TerminalSquareIcon,
} from 'lucide-react';
import { OpenThrottleTabs } from '@openthrottle/react-router-ui';
import { DEFAULT_PLAN_TASKS_VIEW_STORAGE_KEY } from '~/routing/plans/config/defaults';
import {
  isPlanStatusKey,
  PlanStatusBadge,
} from '~/routing/plans/components/PlanStatusBadge';
import {
  PLANS_DETAIL_TAB_SEARCH_PARAM,
  parsePlanDetailTab,
  parsePlanTasksView,
} from '~/routing/plans/utils/parsers';
import { PlanTabConfiguration } from '~/routing/plans/components/PlanTabConfiguration';
import { PlanTabDetails } from '~/routing/plans/components/PlanTabDetails';
import { PlanTabTasks } from '~/routing/plans/components/PlanTabTasks';
import { PlanToolbar } from '~/routing/plans/components/PlanToolbar';
import { PlanTasksBoard } from '~/routing/plans/components/PlanTasksBoard';
import { PlanTabOutput } from '~/routing/plans/components/PlanTabOutput';
import { formatPlanDate } from '~/routing/plans/utils/formatters';
import { usePlanOutputStream } from '~/routing/plans/hooks/usePlanOutputStream';
import { usePlanLifecycleRevalidation } from '~/routing/plans/hooks/usePlanLifecycleRevalidation';
import { usePlanRunConfigEditor } from '~/routing/plans/hooks/usePlanRunConfigEditor';
import {
  jobRunHooksJsonAtom,
  jobRunHooksValidationAtom,
  runConfigSaveBlockedAtom,
  runConfigSaveBlockedReasonAtom,
  workflowRalphTuningJsonAtom,
  workflowWorkingDirectoryAtom,
} from '~/routing/plans/data/atom.plan';
import type { Route } from '@/app/routes/+types/plans.$planId._index';

export interface PlanDetailRouteProps {
  readonly loaderData: Route.ComponentProps['loaderData'];
  readonly params: Route.ComponentProps['params'];
  readonly plan: NonNullable<Route.ComponentProps['loaderData']['plan']>;
}

export const PlanDetailRoute = (
  props: PlanDetailRouteProps,
): React.ReactElement => {
  const { loaderData, params, plan } = props;
  const { tagVocabulary, tasks } = loaderData;

  // Hooks
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tagFetcher = useFetcher();
  const {
    onResetToDefaults,
    onSaveJobRunHooks,
    onSaveRunConfig,
    onToggleExpanded,
    saveJobRunHooksPending,
    saveRunConfigPending,
  } = usePlanRunConfigEditor(plan);

  // Route-scoped run-config atoms (seeded by PlanRunConfigStoreProvider).
  const jobRunHooksJson = useAtomValue(jobRunHooksJsonAtom);
  const jobRunHooksValidation = useAtomValue(jobRunHooksValidationAtom);
  const ralphTuningJson = useAtomValue(workflowRalphTuningJsonAtom);
  const runConfigSaveBlocked = useAtomValue(runConfigSaveBlockedAtom);
  const runConfigSaveBlockedReason = useAtomValue(
    runConfigSaveBlockedReasonAtom,
  );
  const workingDirectory = useAtomValue(workflowWorkingDirectoryAtom);

  // Setup
  const [fullscreen, setFullscreen] = React.useState(false);

  const planTasksView = parsePlanTasksView(searchParams.get('view')) ?? 'table';
  const isBoardView = planTasksView === 'board';

  const planId = params.planId ?? '';

  // Pilot: seed from the loader snapshot, then merge live deltas from the
  // planOutputChunkAdded subscription (graphql-ws). Socket.IO keeps running.
  const planOutputChunks = usePlanOutputStream(
    planId,
    loaderData.planOutputChunks,
  );
  const status = isPlanStatusKey(plan.status) ? plan.status : 'PENDING';

  const completedTaskCount = tasks.filter(
    (task) => task.status === 'COMPLETED',
  ).length;

  // Whether the page-level toolbar's Run/Queue is blocked. Reuses the config
  // editor's validation (workflow options + workspace path) and folds in the
  // job-run-hooks draft validity, matching the prior in-tab computation.
  const jobRunHooksBlocked = !jobRunHooksValidation.ok;
  const workflowRunBlocked = runConfigSaveBlocked || jobRunHooksBlocked;
  const workflowRunBlockedReason = jobRunHooksBlocked
    ? (jobRunHooksValidation.issues[0] ??
      'Fix job run lifecycle hooks in Configuration.')
    : runConfigSaveBlockedReason;

  // Handlers

  // Markup

  // Life Cycle

  // When URL has no `view`, apply last choice from localStorage (board only adds a query param).
  // Runs when the plan changes so switching plans can restore the saved board preference without
  // re-applying on every search-param change (e.g. after the user clears `view` for table).
  React.useEffect(() => {
    if (parsePlanTasksView(searchParams.get('view'))) return;

    try {
      const stored = parsePlanTasksView(
        localStorage.getItem(DEFAULT_PLAN_TASKS_VIEW_STORAGE_KEY),
      );
      if (stored === 'board') {
        const next = new URLSearchParams(searchParams);
        next.set('view', 'board');
        setSearchParams(next, { replace: true });
      }
    } catch {
      // ignore
    }
  }, [planId]);

  // Keep storage in sync when `view` is present in the URL (e.g. shared links).
  React.useEffect(() => {
    const fromUrl = parsePlanTasksView(searchParams.get('view'));
    if (!fromUrl) return;

    try {
      localStorage.setItem(DEFAULT_PLAN_TASKS_VIEW_STORAGE_KEY, fromUrl);
    } catch {
      // ignore
    }
  }, [searchParams]);

  // Revalidate plan detail when a plan/task lifecycle notification arrives over
  // the GraphQL subscription (server-side topic routing by planId).
  usePlanLifecycleRevalidation(planId);

  // Cmd/Ctrl+E jumps to the plan edit route.
  useKeyboardShortcut({
    enabled: true,
    key: 'e',
    meta: true,
    onPress: () => navigate(`/plans/${planId}/edit`),
  });

  // 🔌 Short Circuit
  return (
    <>
      <GlobalScreen className="-max-w-5xl flex h-full w-full flex-col gap-4 p-4 md:gap-8 md:p-8 lg:gap-12 lg:p-12">
        <div>
          <GlobalHeading
            className="mb-4"
            icon={NotebookTextIcon}
            title={plan.title ?? 'Untitled'}
          />
          <div className="text-muted-foreground line-clamp-3 flex items-center gap-2 text-sm">
            <PlanStatusBadge status={status} to={`/plans?status=${status}`} />
            <span>&bull;</span>
            {plan.projectRelation?.id != null ? (
              <Badge asChild={true} color="slate" size="xs">
                <Link
                  to={`/projects/${plan.projectRelation.id}`}
                  viewTransition={true}
                >
                  {plan.projectRelation.name}
                </Link>
              </Badge>
            ) : (
              <Badge color="slate" size="xs">
                {plan.projectRelation?.name
                  ? plan.projectRelation.name
                  : plan.project}
              </Badge>
            )}
            <span>&bull;</span>
            <span>Last updated</span>
            <span>&bull;</span>
            <span className="font-medium">
              {formatPlanDate(plan.updatedAt)}
            </span>
          </div>
        </div>

        <PlanToolbar
          className="bg-card border-card-border rounded-lg border p-4"
          jobRunHooksJson={jobRunHooksJson}
          onAddTag={(tag) =>
            tagFetcher.submit({ intent: 'addPlanTag', tag }, { method: 'post' })
          }
          onRemoveTag={(tag) =>
            tagFetcher.submit(
              { intent: 'removePlanTag', tag },
              { method: 'post' },
            )
          }
          planId={plan.id}
          planStatus={plan.status}
          planTitle={plan.title ?? 'Untitled'}
          ralphTuningJson={ralphTuningJson}
          tagVocabulary={tagVocabulary}
          tags={plan.tags}
          tagsPending={tagFetcher.state !== 'idle'}
          workflowRunBlocked={workflowRunBlocked}
          workflowRunBlockedReason={workflowRunBlockedReason}
          workingDirectory={workingDirectory}
        />

        <OpenThrottleTabs
          urlSync={{
            defaultValue: 'overview',
            param: PLANS_DETAIL_TAB_SEARCH_PARAM,
            parse: (raw) => parsePlanDetailTab(raw) ?? undefined,
          }}
        >
          <TabsList
            className="mb-8 w-full max-w-full justify-start gap-4 overflow-x-auto overflow-y-hidden"
            variant="line"
          >
            <TabsTrigger
              className="flex-0 cursor-pointer"
              id="plan-tab-overview"
              value="overview"
            >
              <BoltIcon />
              Details
            </TabsTrigger>
            <TabsTrigger
              className="flex-0 cursor-pointer"
              id="plan-tab-tasks"
              value="tasks"
            >
              <LayoutListIcon />
              Tasks ({completedTaskCount}/{tasks.length})
            </TabsTrigger>
            <TabsTrigger
              className="flex-0 cursor-pointer"
              id="plan-tab-output"
              value="output"
            >
              <TerminalSquareIcon />
              Output
            </TabsTrigger>

            <div className="flex-1" />
            <TabsTrigger
              className="flex-0 cursor-pointer"
              id="plan-tab-configuration"
              value="configuration"
            >
              <CogIcon />
              Configuration
            </TabsTrigger>
          </TabsList>

          <PlanTabDetails
            fullscreen={fullscreen}
            setFullscreen={setFullscreen}
          />
          <PlanTabTasks />
          <PlanTabOutput chunks={planOutputChunks} />
          <PlanTabConfiguration
            onCollapse={() => onToggleExpanded(false)}
            onResetToDefaults={onResetToDefaults}
            onSaveJobRunHooks={onSaveJobRunHooks}
            onSaveRunConfig={onSaveRunConfig}
            planProjectId={plan.projectId}
            repositories={loaderData.workspaceRepositories}
            saveJobRunHooksDisabled={!jobRunHooksValidation.ok}
            saveJobRunHooksPending={saveJobRunHooksPending}
            saveRunConfigDisabled={runConfigSaveBlocked}
            saveRunConfigPending={saveRunConfigPending}
          />

          {/* saveJobRunHooks / saveRunConfig outcomes surface as toasts
                (useActionToast in usePlanRunConfigEditor). */}

          {runConfigSaveBlocked && runConfigSaveBlockedReason != null ? (
            <p className="text-muted-foreground px-4 text-xs" role="note">
              Save configuration blocked: {runConfigSaveBlockedReason}
            </p>
          ) : null}
        </OpenThrottleTabs>
      </GlobalScreen>

      {isBoardView ? (
        <Card className="mx-4 overflow-hidden">
          <PlanTasksBoard />
        </Card>
      ) : null}
    </>
  );
};
