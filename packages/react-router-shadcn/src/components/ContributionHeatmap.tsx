'use client';

import * as React from 'react';
import { cn } from '../utils/cn';

/** A single day's value in the heatmap. `date` is an ISO `YYYY-MM-DD` string. */
export interface ContributionHeatmapValue {
  readonly count: number;
  readonly date: string;
}

export interface ContributionHeatmapProps {
  /** Accessible label for the grid. Defaults to `"Contribution activity"`. */
  readonly 'aria-label'?: string;
  readonly className?: string;
  /**
   * Last day shown (right-most column), as `YYYY-MM-DD`. Defaults to today.
   * The grid always ends on the Saturday of this day's week; future days in
   * that column render as empty placeholders (GitHub parity).
   */
  readonly endDate?: string;
  /** Fired with the cell's `YYYY-MM-DD` when a day is activated (click/Enter/Space). */
  readonly onSelectDate?: (date: string) => void;
  /** Per-day counts. Days not present are treated as `0`. */
  readonly values: ReadonlyArray<ContributionHeatmapValue>;
  /** Number of week columns to render. Defaults to `26` (~6 months). */
  readonly weeks?: number;
}

/** Intensity levels: index 0 is "empty", 1–4 ramp from light to full. */
const LEVEL_CLASSNAMES: ReadonlyArray<string> = [
  'bg-muted',
  'bg-primary/25',
  'bg-primary/45',
  'bg-primary/70',
  'bg-primary',
];

const WEEKDAY_LABELS: ReadonlyArray<string> = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

/** Weekday rows that render a label on the left rail (Mon / Wed / Fri). */
const LABELED_WEEKDAY_ROWS: ReadonlyArray<number> = [1, 3, 5];

const MONTH_LABELS: ReadonlyArray<string> = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DAY_MS = 86_400_000;
const DEFAULT_WEEKS = 26;

interface HeatmapCell {
  readonly count: number;
  readonly date: string;
  /** true for future days past `endDate` — rendered as an inert placeholder. */
  readonly isPlaceholder: boolean;
  readonly level: number;
}

interface HeatmapColumn {
  readonly cells: ReadonlyArray<HeatmapCell>;
  /** Short month name to print above this column, or null. */
  readonly monthLabel: string | null;
}

// UTC-based date helpers keep the grid stable regardless of the viewer's TZ/DST.
function parseYmd(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function bucketLevel(count: number, max: number): number {
  if (count <= 0 || max <= 0) {
    return 0;
  }

  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4)));
}

/**
 * @description GitHub-contributions-style calendar heatmap. Renders weekday rows × week columns of day cells, color-graded by relative daily count. Framework-agnostic: takes a plain `{ date, count }[]` and an optional `onSelectDate` for day click-through.
 */
export function ContributionHeatmap(
  props: ContributionHeatmapProps,
): React.ReactElement {
  const {
    'aria-label': ariaLabel = 'Contribution activity',
    className,
    endDate,
    onSelectDate,
    values,
    weeks = DEFAULT_WEEKS,
  } = props;

  // Hooks
  const columns = React.useMemo<ReadonlyArray<HeatmapColumn>>(() => {
    const countByDate = new Map<string, number>();
    let max = 0;
    for (const value of values) {
      countByDate.set(value.date, value.count);
      if (value.count > max) {
        max = value.count;
      }
    }

    const end =
      endDate != null ? parseYmd(endDate) : parseYmd(toYmd(new Date()));
    // Right-most column ends on the Saturday of `end`'s week.
    const gridEnd = addDays(end, 6 - end.getUTCDay());
    const totalDays = weeks * 7;
    const gridStart = addDays(gridEnd, -(totalDays - 1));

    const result: HeatmapColumn[] = [];
    let previousMonth = -1;
    for (let week = 0; week < weeks; week += 1) {
      const cells: HeatmapCell[] = [];
      for (let weekday = 0; weekday < 7; weekday += 1) {
        const day = addDays(gridStart, week * 7 + weekday);
        const isPlaceholder = day.getTime() > end.getTime();
        const date = toYmd(day);
        const count = countByDate.get(date) ?? 0;
        cells.push({
          count,
          date,
          isPlaceholder,
          level: isPlaceholder ? 0 : bucketLevel(count, max),
        });
      }

      // Label the column when its first row crosses into a new month.
      const columnMonth = addDays(gridStart, week * 7).getUTCMonth();
      const monthLabel =
        columnMonth !== previousMonth ? MONTH_LABELS[columnMonth] : null;
      previousMonth = columnMonth;

      result.push({ cells, monthLabel });
    }

    return result;
  }, [endDate, values, weeks]);

  // Setup
  const isInteractive = onSelectDate != null;

  // Handlers
  const handleSelect = React.useCallback(
    (date: string): void => {
      onSelectDate?.(date);
    },
    [onSelectDate],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (values.length === 0) {
    return (
      <div
        className={cn(
          'text-muted-foreground flex min-h-[140px] items-center justify-center text-sm',
          className,
        )}
        data-slot="contribution-heatmap"
      >
        No contribution activity to show.
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      data-slot="contribution-heatmap"
    >
      <div className="flex gap-[3px]">
        {/* Left rail: weekday labels, aligned to the cell grid rows. */}
        <div className="mr-1 flex flex-col gap-[3px] pt-[15px]">
          {WEEKDAY_LABELS.map((label, row) => (
            <div
              className="text-muted-foreground flex h-3 items-center text-[9px] leading-none"
              key={label}
            >
              {LABELED_WEEKDAY_ROWS.includes(row) ? label : ''}
            </div>
          ))}
        </div>

        <div
          aria-label={ariaLabel}
          className="flex gap-[3px] overflow-x-auto"
          role="grid"
        >
          {columns.map((column, columnIndex) => (
            <div
              className="flex flex-col gap-[3px]"
              key={`week-${columnIndex}`}
              role="row"
            >
              {/* Month label sits above the top cell of the column. */}
              <div className="text-muted-foreground relative h-3 text-[9px] leading-none">
                {column.monthLabel != null ? (
                  <span className="absolute whitespace-nowrap">
                    {column.monthLabel}
                  </span>
                ) : null}
              </div>

              {column.cells.map((cell) => {
                if (cell.isPlaceholder) {
                  return (
                    <div
                      aria-hidden="true"
                      className="size-3"
                      key={cell.date}
                    />
                  );
                }

                const cellLabel = `${cell.count} ${cell.count === 1 ? 'contribution' : 'contributions'} on ${cell.date}`;

                return (
                  <button
                    aria-label={cellLabel}
                    className={cn(
                      'size-3 rounded-[2px] outline-none',
                      LEVEL_CLASSNAMES[cell.level],
                      isInteractive
                        ? 'focus-visible:ring-ring cursor-pointer focus-visible:ring-2'
                        : 'cursor-default',
                    )}
                    disabled={!isInteractive}
                    key={cell.date}
                    onClick={() => handleSelect(cell.date)}
                    role="gridcell"
                    title={cellLabel}
                    type="button"
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend: Less → More intensity ramp. */}
      <div className="text-muted-foreground flex items-center gap-1 self-end text-[10px]">
        <span>Less</span>
        {LEVEL_CLASSNAMES.map((levelClassName, level) => (
          <span
            aria-hidden="true"
            className={cn('size-3 rounded-[2px]', levelClassName)}
            key={`legend-${level}`}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
