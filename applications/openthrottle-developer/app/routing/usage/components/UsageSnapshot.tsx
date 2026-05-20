import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  toast,
} from '@openthrottle/react-router-shadcn';
import { buildUsageSupportSnapshotJson } from '~/routing/usage/utils/build-usage-support-snapshot';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

export interface UsageSnapshotProps {
  dailyStats: ReadonlyArray<DashboardDailyStatsCardFragment>;
  rangeDays: number;
  rangeEndIso: string;
  rangeStartIso: string;
}

/**
 * @description Lets operators attach the same coarse usage data to tickets without new analytics APIs.
 */
export const UsageSnapshot = (props: UsageSnapshotProps) => {
  const { dailyStats, rangeDays, rangeEndIso, rangeStartIso } = props;

  // Hooks

  // Setup

  // Handlers
  const handleCopy = async (): Promise<void> => {
    const text = buildUsageSupportSnapshotJson({
      dailyStats,
      rangeDays,
      rangeEndIso,
      rangeStartIso,
    });
    try {
      await navigator.clipboard.writeText(text);

      toast.success('Usage snapshot copied to clipboard');
    } catch {
      // ignore
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

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
        <Button onClick={handleCopy} type="button" variant="outline">
          Copy usage snapshot (JSON)
        </Button>
      </CardContent>
    </Card>
  );
};
