import * as React from 'react';
import { Link } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GetUsageDailyStatsDocument } from '~/__generated__/graphql';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { DashboardDailyStatsCard } from '~/routing/dashboard/components/DashboardDailyStatsCard';
import type { Route } from '@/app/routes/+types/usage._index';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Usage',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const end = new Date();
  const endIso = end.toISOString();

  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();

  const result = await executeGraphqlWithAuth(
    args.request,
    GetUsageDailyStatsDocument,
    { end: endIso, start: startIso },
  );

  const dailyStats = result.dailyStatsRange.items ?? [];

  return {
    dailyStats: dailyStats as DashboardDailyStatsCardFragment[],
    rangeDays: 30,
  };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Usage | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { dailyStats, rangeDays } = loaderData;

  return (
    <GlobalScreen>
      <Card className="mb-6 bg-transparent">
        <CardHeader>
          <CardTitle className="text-base">Agents &amp; Cortex usage</CardTitle>
          <CardDescription>
            Plan and task counts come from OpenThrottle daily stats (last{' '}
            {rangeDays} days). They approximate automation load from Ralph,
            workflows, and manual work in the portal—they do not include model
            token usage or per-prompt billing. For prompt-level debugging, use{' '}
            <Link className="underline" to="/prompts">
              Prompts
            </Link>{' '}
            and the versioning panel on a prompt detail page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              Not in this chart:{' '}
            </span>
            per-skill or per-prompt invocations, IDE-only runs, token or cost
            usage, and skill picks from user-local{' '}
            <code className="text-xs">~/.cursor/skills-cursor</code>.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link className="text-primary underline" to="/prompts?type=AGENTS">
              Agents-type prompts
            </Link>
            <Link className="text-primary underline" to="/prompts?type=SKILLS">
              Skills-type prompts
            </Link>
            <Link className="text-primary underline" to="/skills">
              Repo skill paths
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Daily activity</h2>
        <DashboardDailyStatsCard dailyStats={dailyStats} />
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
