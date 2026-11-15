import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PlanRunDialogSchedule } from '~/routing/plans/components/PlanRunDialogSchedule';
import { PLAN_RUN_DIALOG_COPY } from '~/routing/plans/data/data.copy';
import type { UsePlanRunDialogResult } from '~/routing/plans/hooks/usePlanRunDialog';

export interface PlanRunDialogTabsProps {
  /** @description The dialog's state; the tabs read the mode, schedule draft and Repeat control from it. */
  readonly dialog: UsePlanRunDialogResult;
}

/**
 * @description The Run dialog's mode tabs: Run now (a one-line summary) and Schedule (date, time,
 * Repeat and timezone, {@link PlanRunDialogSchedule}). Extracted from {@link PlanRunDialog} to
 * keep it under the component line cap.
 */
export const PlanRunDialogTabs = (
  props: PlanRunDialogTabsProps,
): React.ReactElement => {
  const { dialog } = props;
  const { draft } = dialog;

  // Hooks

  // Setup
  const copy = PLAN_RUN_DIALOG_COPY;

  // Handlers
  const handleModeChange = (value: string): void => {
    return dialog.onModeChange(value === 'schedule' ? 'schedule' : 'run');
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Tabs onValueChange={handleModeChange} value={draft.mode}>
      <TabsList>
        <TabsTrigger value="run">{copy.modeRunLabel}</TabsTrigger>
        <TabsTrigger value="schedule">{copy.modeScheduleLabel}</TabsTrigger>
      </TabsList>
      <TabsContent value="run">
        <p className="text-muted-foreground text-sm">{copy.runSummary}</p>
      </TabsContent>
      <TabsContent value="schedule">
        <PlanRunDialogSchedule
          date={draft.scheduleDate}
          error={dialog.scheduleError}
          onDateChange={dialog.onScheduleDateChange}
          onTimeChange={dialog.onScheduleTimeChange}
          repeat={dialog.repeat}
          summary={dialog.scheduleSummary}
          time={draft.scheduleTime}
          timeZone={dialog.timeZone}
        />
      </TabsContent>
    </Tabs>
  );
};
