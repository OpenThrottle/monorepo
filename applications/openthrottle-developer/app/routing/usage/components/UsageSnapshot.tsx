import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';
import { buildUsageSupportSnapshotJson } from '~/routing/usage/utils/build-usage-support-snapshot';

export interface UsageSnapshotProps {
  readonly dailyStats: ReadonlyArray<DashboardDailyStatsCardFragment>;
  readonly rangeDays: number;
  readonly rangeEndIso: string;
  readonly rangeStartIso: string;
}

/**
 * @description Lets operators attach the same coarse usage data to tickets without new analytics APIs.
 */
export function UsageSnapshot(props: UsageSnapshotProps): React.ReactElement {
  const { dailyStats, rangeDays, rangeEndIso, rangeStartIso } = props;

  const handleCopy = async (): Promise<void> => {
    const text = buildUsageSupportSnapshotJson({
      dailyStats,
      rangeDays,
      rangeEndIso,
      rangeStartIso,
    });
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <Card className="border-dashed bg-muted/15">
      <CardHeader>
        <CardTitle className="text-base">Export coarse usage data</CardTitle>
        <CardDescription>
          Copies the date range, each daily row, and series totals as JSON. This
          does not add missing analytics—it packages what the chart already
          shows so you can paste into an issue or compare environments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => void handleCopy()}
          type="button"
          variant="outline"
        >
          Copy usage snapshot (JSON)
        </Button>
      </CardContent>
    </Card>
  );
}
