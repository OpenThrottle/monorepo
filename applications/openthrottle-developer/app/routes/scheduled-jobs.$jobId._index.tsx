import * as React from 'react';
import { Form, redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Badge, Button } from '@openthrottle/react-router-shadcn';
import {
  DeleteScheduledAgentJobDocument,
  RunScheduledAgentJobNowDocument,
  ScheduledAgentJobDetailDocument,
  SetScheduledAgentJobEnabledDocument,
} from '~/__generated__/graphql';
import { ScheduledJobRunsTable } from '~/routing/scheduled-jobs/components/ScheduledJobRunsTable';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/scheduled-jobs.$jobId._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.loaderData?.job?.name ?? 'Scheduled Job',
  links: (_match) => [{ children: 'Scheduled Jobs', to: '/scheduled-jobs' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { jobId } = args.params;

  const { scheduledAgentJob, scheduledAgentJobRuns } =
    await executeGraphqlWithAuth(
      args.request,
      ScheduledAgentJobDetailDocument,
      {
        id: jobId,
      },
    );

  if (scheduledAgentJob == null) {
    throw new Response('Scheduled job not found', { status: 404 });
  }

  return { job: scheduledAgentJob, runs: scheduledAgentJobRuns };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Scheduled job | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const { job, runs } = loaderData;
  const actionError =
    actionData != null && 'error' in actionData ? actionData.error : undefined;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="flex flex-col gap-6" data-testid="ScheduledJobDetail">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{job.name}</h1>
              <Badge variant={job.enabled ? 'default' : 'secondary'}>
                {job.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 font-mono text-xs">
              {job.driverId}
              {job.model ? ` · ${job.model}` : ''} · {job.cronPattern}
              {job.timezone ? ` (${job.timezone})` : ' (UTC)'}
            </p>
          </div>

          <div className="flex gap-2">
            <Form method="post">
              <input name="intent" type="hidden" value="run-now" />
              <Button type="submit" variant="outline">
                Run now
              </Button>
            </Form>
            <Form method="post">
              <input name="intent" type="hidden" value="toggle-enabled" />
              <input
                name="enabled"
                type="hidden"
                value={job.enabled ? 'false' : 'true'}
              />
              <Button type="submit" variant="outline">
                {job.enabled ? 'Disable' : 'Enable'}
              </Button>
            </Form>
            <Form method="post">
              <input name="intent" type="hidden" value="delete" />
              <Button type="submit" variant="destructive">
                Delete
              </Button>
            </Form>
          </div>
        </div>

        {actionError ? (
          <p className="text-destructive text-sm" role="alert">
            {actionError}
          </p>
        ) : null}

        <section>
          <h2 className="mb-1 text-sm font-medium">Prompt</h2>
          <pre className="bg-muted overflow-x-auto rounded-md p-3 text-sm whitespace-pre-wrap">
            {job.prompt}
          </pre>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium">Run history</h2>
            <span className="text-muted-foreground text-xs">
              Logs stream to the queue console keyed by each run.
            </span>
          </div>
          {runs.length === 0 ? (
            <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
              No runs yet. Use “Run now” to trigger one.
            </p>
          ) : (
            <ScheduledJobRunsTable className="bg-card" runs={runs} />
          )}
        </section>
      </div>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { jobId } = args.params;
  const form = await args.request.formData();
  const intent = form.get('intent');

  try {
    if (intent === 'run-now') {
      await executeGraphqlWithAuth(
        args.request,
        RunScheduledAgentJobNowDocument,
        {
          id: jobId,
        },
      );
      return { ok: true };
    }

    if (intent === 'toggle-enabled') {
      const enabled = form.get('enabled') === 'true';
      await executeGraphqlWithAuth(
        args.request,
        SetScheduledAgentJobEnabledDocument,
        { input: { enabled, id: jobId } },
      );
      return { ok: true };
    }

    if (intent === 'delete') {
      await executeGraphqlWithAuth(
        args.request,
        DeleteScheduledAgentJobDocument,
        {
          id: jobId,
        },
      );
      return redirect('/scheduled-jobs');
    }

    return { error: 'Unknown action.' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Action failed.',
    };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
