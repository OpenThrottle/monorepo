import * as React from 'react';
import { GlobalModal } from '@openthrottle/react-router-ui-global';
import { useSearchParams } from 'react-router';
import {
  CHART_CONFIG,
  formatChartDate,
} from '~/routing/dashboard/components/DashboardDailyStatsCard';
import { DashboardDailyStatsDayChart } from '~/routing/dashboard/components/DashboardDailyStatsDayChart';
import {
  DAILY_STATS_METRICS,
  DAILY_STATS_MODAL_COPY,
} from '~/routing/dashboard/data/data.copy';
import {
  parseSelectedStatDate,
  SELECTED_DATE_PARAM,
  selectDailyStatByDate,
  selectMostRecentDailyStat,
  shiftIsoDate,
} from '~/routing/dashboard/utils/daily-stats-selection';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

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

    let max = dailyStats[0].date;
    let min = dailyStats[0].date;

    for (const item of dailyStats) {
      if (item.date > max) max = item.date;
      if (item.date < min) min = item.date;
    }

    return { max, min };
  }, [dailyStats]);

  // Handlers

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

      {selected === null ? (
        <p className="text-muted-foreground text-sm">
          {DAILY_STATS_MODAL_COPY.emptyDescription}
        </p>
      ) : (
        <div className="flex flex-col gap-4" data-testid="daily-stats-detail">
          <p className="text-muted-foreground text-sm">
            {formatChartDate(selected.date)}
          </p>

          {isFallback ? (
            <p className="text-muted-foreground text-xs">
              {DAILY_STATS_MODAL_COPY.mostRecentHint}
            </p>
          ) : null}

          <p className="text-muted-foreground text-xs">
            {DAILY_STATS_MODAL_COPY.completionAttributionCaveat}
          </p>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {DAILY_STATS_METRICS.map((metric) => (
              <div className="flex items-center gap-2" key={metric.key}>
                <span
                  aria-hidden={true}
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: CHART_CONFIG[metric.key]?.color }}
                />
                <dt className="text-muted-foreground">{metric.label}</dt>
                <dd className="ml-auto font-medium tabular-nums">
                  {selected[metric.key]}
                </dd>
              </div>
            ))}
          </dl>

          <DashboardDailyStatsDayChart datum={selected} />
        </div>
      )}
    </GlobalModal>
  );
};

DashboardDailyStatsModal.key = 'daily-stats';
