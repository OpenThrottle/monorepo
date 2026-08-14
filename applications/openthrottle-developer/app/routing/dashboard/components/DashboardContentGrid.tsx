import * as React from 'react';
import { Await, Link, useNavigate } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';
import { WEEKLY_ACTIVITY_DAYS } from '~/routing/dashboard/config/config.dashboard';
import { DashboardActivityChartSkeleton } from '~/routing/dashboard/components/DashboardActivityChartSkeleton';
import { DashboardContributionsCard } from '~/routing/dashboard/components/DashboardContributionsCard';
import { DashboardContributionsCardSkeleton } from '~/routing/dashboard/components/DashboardContributionsCardSkeleton';
import { DashboardDailyStatsCard } from '~/routing/dashboard/components/DashboardDailyStatsCard';
import { DashboardDeferredCard } from '~/routing/dashboard/components/DashboardDeferredCard';
import { DashboardGetStartedSection } from '~/routing/dashboard/components/DashboardGetStartedSection';
import { DashboardGithubTokenEmptyState } from '~/routing/dashboard/components/DashboardGithubTokenEmptyState';
import { DashboardQueueHealthCard } from '~/routing/dashboard/components/DashboardQueueHealthCard';
import { DashboardDailyStatsModal } from '~/routing/dashboard/components/DashboardDailyStatsModal';
import { DashboardOpenPrsByAuthorCard } from '~/routing/dashboard/components/DashboardOpenPrsByAuthorCard';
import { DashboardPrCardsSkeleton } from '~/routing/dashboard/components/DashboardPrCardsSkeleton';
import { DashboardPrTimeInStateCard } from '~/routing/dashboard/components/DashboardPrTimeInStateCard';
import { DashboardRecentActivity } from '~/routing/dashboard/components/DashboardRecentActivity';
import { DashboardRecentChatsCard } from '~/routing/dashboard/components/DashboardRecentChatsCard';
import { DashboardToolbar } from '~/routing/dashboard/components/DashboardToolbar';
import type { Route } from '@/app/routes/+types/dashboard._index';

type DashboardLoaderData = Route.ComponentProps['loaderData'];

export interface DashboardContentGridProps {
  core: DashboardLoaderData['core'];
  githubStats: DashboardLoaderData['githubStats'];
  onboarding: DashboardLoaderData['onboarding'];
  recentChats: DashboardLoaderData['recentChats'];
}

/**
 * @description The dashboard's deferred card grid (queue health, recent chats,
 * weekly activity, contributions heatmap, PR stats, recent activity) plus the
 * daily-stats modal. Extracted from the route Component per route-primitive-shape
 * R4 so the route file stays a thin adapter.
 */
export const DashboardContentGrid = (
  props: DashboardContentGridProps,
): React.ReactElement => {
  const { core, githubStats, onboarding, recentChats } = props;

  // Hooks
  const navigate = useNavigate();

  // Setup

  // Handlers
  const handleSelectDate = React.useCallback(
    (date: string): void => {
      navigate(
        `/dashboard?modal=${DashboardDailyStatsModal.key}&date=${date}`,
        {
          preventScrollReset: true,
          viewTransition: true,
        },
      );
    },
    [navigate],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <div
        className="--lg:grid-cols-3 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8 lg:gap-12"
        data-testid="dashboard-content-grid"
      >
        {/* Get Started onboarding checklist — first child, full width. */}
        <DashboardGetStartedSection onboarding={onboarding} />

        <div className="col-span-2 md:col-span-1">
          <DashboardDeferredCard
            errorText="Couldn’t load queue health."
            fallback={<DashboardPrCardsSkeleton />}
            resolve={core}
          >
            {(data) => <DashboardQueueHealthCard queues={data.queues} />}
          </DashboardDeferredCard>
        </div>
        <div className="col-span-2 md:col-span-1">
          <DashboardDeferredCard
            errorText="Couldn’t load recent chats."
            fallback={<DashboardPrCardsSkeleton />}
            resolve={recentChats}
          >
            {(data) => (
              <DashboardRecentChatsCard
                className="h-full flex-1"
                conversations={data.conversations}
              />
            )}
          </DashboardDeferredCard>
        </div>

        <div className="col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2>This Week's Activity</h2>
            <Button asChild={true} size="sm" variant="outline">
              <Link
                preventScrollReset={true}
                to="/dashboard?modal=daily-stats"
                viewTransition={true}
              >
                Expand chart details
              </Link>
            </Button>
          </div>
          <DashboardDeferredCard
            errorText="Couldn’t load this week’s activity."
            fallback={<DashboardActivityChartSkeleton />}
            resolve={core}
          >
            {(data) => (
              <DashboardDailyStatsCard
                dailyStats={data.dailyStatsRange.items.slice(
                  -WEEKLY_ACTIVITY_DAYS,
                )}
                onSelectDate={handleSelectDate}
              />
            )}
          </DashboardDeferredCard>
        </div>

        <div className="col-span-2">
          <DashboardDeferredCard
            errorText="Couldn’t load contribution activity."
            fallback={<DashboardContributionsCardSkeleton />}
            resolve={core}
          >
            {(data) => (
              <DashboardContributionsCard
                dailyStats={data.dailyStatsRange.items}
                onSelectDate={handleSelectDate}
              />
            )}
          </DashboardDeferredCard>
        </div>

        <DashboardToolbar className="col-span-2" />

        <div>
          <h3 className="mb-4">PR Time in State</h3>
          <DashboardDeferredCard
            errorText="Couldn’t load PR stats."
            fallback={<DashboardPrCardsSkeleton />}
            resolve={githubStats}
          >
            {(stats) =>
              stats.githubTokenConfigured ? (
                <DashboardPrTimeInStateCard
                  prTimeInStateSummary={stats.prTimeInStateSummary}
                />
              ) : (
                <DashboardGithubTokenEmptyState />
              )
            }
          </DashboardDeferredCard>
        </div>

        <div>
          <h3 className="mb-4">PRs by author</h3>
          <DashboardDeferredCard
            errorText="Couldn’t load PR stats."
            fallback={<DashboardPrCardsSkeleton />}
            resolve={githubStats}
          >
            {(stats) =>
              stats.githubTokenConfigured ? (
                <DashboardOpenPrsByAuthorCard githubStats={stats} />
              ) : (
                <DashboardGithubTokenEmptyState />
              )
            }
          </DashboardDeferredCard>
        </div>

        <div className="col-span-2">
          <DashboardDeferredCard
            errorText="Couldn’t load recent activity."
            fallback={<DashboardActivityChartSkeleton />}
            resolve={core}
          >
            {(data) => <DashboardRecentActivity data={data.activityByDate} />}
          </DashboardDeferredCard>
        </div>
      </div>

      {/* Portal-rendered (Dialog): invisible until ?modal=daily-stats. */}
      <React.Suspense fallback={null}>
        <Await errorElement={null} resolve={core}>
          {(data) => (
            <DashboardDailyStatsModal dailyStats={data.dailyStatsRange.items} />
          )}
        </Await>
      </React.Suspense>
    </>
  );
};
