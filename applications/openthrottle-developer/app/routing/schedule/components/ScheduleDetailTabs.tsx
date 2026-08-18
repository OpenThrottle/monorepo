import * as React from 'react';
import {
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleTabs } from '@openthrottle/react-router-ui';
import { FileTextIcon, HistoryIcon } from 'lucide-react';
import type { ScheduledJobRunRowFragment } from '~/__generated__/graphql';
import { ScheduleRunsTable } from '~/routing/schedule/components/ScheduleRunsTable';
import {
  SCHEDULE_DETAIL_TAB_SEARCH_PARAM,
  parseScheduleDetailTab,
} from '~/routing/schedule/utils/parse-schedule-detail-tab';

export interface ScheduleDetailTabsProps {
  /** Scheduled job id; used to link each run row to its detail route. */
  jobId: string;
  /** The job's prompt, rendered verbatim in the Prompt tab. */
  prompt: string;
  /** Run history for this job; empty renders the no-runs-yet state. */
  runs: ScheduledJobRunRowFragment[];
}

/**
 * @description Tabbed body for the /schedule/:jobId detail route: a `Prompt`
 * tab (the job's prompt) and a `History` tab (the run-history table, or the
 * empty state). Mirrors the skill detail route's OpenThrottleTabs + urlSync so
 * the active tab syncs to the `tab` search param; the shared
 * `useUrlSyncedTabValue` canonicalizes the default (`prompt`) out of the URL.
 */
export const ScheduleDetailTabs = (
  props: ScheduleDetailTabsProps,
): React.ReactElement => {
  const { jobId, prompt, runs } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

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
      </TabsList>

      <TabsContent value="prompt">
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-sm whitespace-pre-wrap">
          {prompt}
        </pre>
      </TabsContent>

      <TabsContent value="history">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs">
            Logs stream to the queue console keyed by each run.
          </span>
          {runs.length === 0 ? (
            <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
              No runs yet. Use “Run now” to trigger one.
            </p>
          ) : (
            <ScheduleRunsTable className="bg-card" jobId={jobId} runs={runs} />
          )}
        </div>
      </TabsContent>
    </OpenThrottleTabs>
  );
};
