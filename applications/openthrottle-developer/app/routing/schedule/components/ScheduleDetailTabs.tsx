import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import {
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleTabs } from '@openthrottle/react-router-ui';
import { FileTextIcon, HistoryIcon, WebhookIcon } from 'lucide-react';
import * as React from 'react';

import type { ScheduledJobRunRowFragment } from '~/__generated__/graphql';
import { ScheduleRunsTable } from '~/routing/schedule/components/ScheduleRunsTable';
import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/copy';
import {
  parseScheduleDetailTab,
  SCHEDULE_DETAIL_TAB_SEARCH_PARAM,
} from '~/routing/schedule/utils/parseScheduleDetailTab';

export interface ScheduleDetailTabsProps {
  /** Scheduled job id; used to link each run row to its detail route. */
  jobId: string;
  /** The job's prompt, rendered verbatim in the Prompt tab. */
  prompt: string;
  /** Run history for this job; empty renders the no-runs-yet state. */
  runs: ScheduledJobRunRowFragment[];
  /** The Webhook tab's body; built by the route, which owns the trigger, action state and one-time reveal. */
  webhook: React.ReactNode;
}

/**
 * @description Tabbed body for the /schedule/:jobId detail route: a `Prompt`
 * tab (the job's prompt), a `History` tab (the run-history table, or the
 * empty state) and a `Webhook` tab (trigger setup, passed in as `webhook`). Mirrors the skill detail route's OpenThrottleTabs + urlSync so
 * the active tab syncs to the `tab` search param; the shared
 * `useUrlSyncedTabValue` canonicalizes the default (`prompt`) out of the URL.
 */
export const ScheduleDetailTabs = (
  props: ScheduleDetailTabsProps,
): React.ReactElement => {
  const { jobId, prompt, runs, webhook } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const hasRuns = runs.length > 0;
  const noRuns = (
    <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
      No runs yet. Use “Run now” to trigger one.
    </p>
  );
  const runsTable = (
    <ScheduleRunsTable className="bg-card" jobId={jobId} runs={runs} />
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleTabs
      urlSync={{
        defaultValue: 'prompt',
        param: SCHEDULE_DETAIL_TAB_SEARCH_PARAM,
        parse: (raw) => parseScheduleDetailTab(raw) ?? undefined,
      }}
    >
      <TabsList
        className="mb-8 w-full max-w-full justify-start gap-4 overflow-x-auto overflow-y-hidden"
        variant="line"
      >
        <TabsTrigger
          className="flex-0 cursor-pointer"
          id="schedule-tab-prompt"
          value="prompt"
        >
          <FileTextIcon />
          Prompt
        </TabsTrigger>
        <TabsTrigger
          className="flex-0 cursor-pointer"
          id="schedule-tab-history"
          value="history"
        >
          <HistoryIcon />
          History
        </TabsTrigger>
        <TabsTrigger
          className="flex-0 cursor-pointer"
          id="schedule-tab-webhook"
          value="webhook"
        >
          <WebhookIcon />
          {SCHEDULE_WEBHOOK_COPY.tabLabel}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="prompt">
        <MarkdownRenderer source={prompt} />
      </TabsContent>

      <TabsContent value="history">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs">
            Logs stream to the queue console keyed by each run.
          </span>
          {hasRuns ? runsTable : noRuns}
        </div>
      </TabsContent>

      <TabsContent value="webhook">{webhook}</TabsContent>
    </OpenThrottleTabs>
  );
};
