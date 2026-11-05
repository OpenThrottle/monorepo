import { GlobalModal } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { useSearchParams } from 'react-router';

import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';
import { DashboardDailyStatsModalDetail } from '~/routing/dashboard/components/DashboardDailyStatsModalDetail';
import { DAILY_STATS_MODAL_COPY } from '~/routing/dashboard/data/data.copy';
import {
  parseSelectedStatDate,
  selectDailyStatByDate,
  SELECTED_DATE_PARAM,
  selectMostRecentDailyStat,
  shiftIsoDate,
} from '~/routing/dashboard/utils/daily-stats-selection';

export interface DashboardDailyStatsModalProps {
  dailyStats: DashboardDailyStatsCardFragment[];
}

export const DashboardDailyStatsModal = (
  props: DashboardDailyStatsModalProps,
): React.ReactElement => {
  const { dailyStats } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const selectedDate = parseSelectedStatDate(searchParams);
  const explicit = selectDailyStatByDate(dailyStats, selectedDate);
  const selected = explicit ?? selectMostRecentDailyStat(dailyStats);
  const isFallback = explicit === null && selected !== null;

  const isOpen = searchParams.get('modal') === DashboardDailyStatsModal.key;
  const selectedDateValue = selected?.date ?? null;
  const dateBounds = React.useMemo((): { max: string; min: string } | null => {
    if (dailyStats.length === 0) {
      return null;
    }

    const dates = dailyStats.map((item) => item.date);
    const [first] = dates;

    if (first === undefined) {
      return null;
    }

    let max = first;
    let min = first;

    for (const date of dates) {
      if (date > max) max = date;
      if (date < min) min = date;
    }

    return { max, min };
  }, [dailyStats]);

  // Handlers
  const renderBody = (): React.ReactElement => {
    if (selected === null) {
      return (
        <p className="text-muted-foreground text-sm">
          {DAILY_STATS_MODAL_COPY.emptyDescription}
        </p>
      );
    }
    return (
      <DashboardDailyStatsModalDetail
        isFallback={isFallback}
        selected={selected}
      />
    );
  };

  // Markup

  // Life Cycle

  // Step the selected day by ±1 with Left/Right arrows while the modal is open, clamped to the
  // available date range so we never scrub into a gap (which would snap back to the most-recent
  // fallback). Skipped when focus is in a text field so typing isn't hijacked.
  React.useEffect(() => {
    if (!isOpen || selectedDateValue === null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const delta = event.key === 'ArrowLeft' ? -1 : 1;
      const next = shiftIsoDate(selectedDateValue, delta);

      if (
        dateBounds !== null &&
        (next < dateBounds.min || next > dateBounds.max)
      ) {
        return;
      }

      event.preventDefault();

      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set(SELECTED_DATE_PARAM, next);
          return params;
        },
        { preventScrollReset: true, replace: true },
      );
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dateBounds, isOpen, selectedDateValue, setSearchParams]);

  // 🔌 Short Circuit

  return (
    <GlobalModal param="modal" value={DashboardDailyStatsModal.key}>
      <h2>{DAILY_STATS_MODAL_COPY.title}</h2>

      {renderBody()}
    </GlobalModal>
  );
};

DashboardDailyStatsModal.key = 'daily-stats';
