'use client';

import * as React from 'react';
import { cn } from '../utils/cn';
import {
  buildHeatmapColumns,
  DEFAULT_WEEKS,
  LABELED_WEEKDAY_ROWS,
  LEVEL_CLASSNAMES,
  WEEKDAY_LABELS,
} from './ContributionHeatmap.helpers';

export type { ContributionHeatmapValue } from './ContributionHeatmap.helpers';

import type { ContributionHeatmapValue } from './ContributionHeatmap.helpers';

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

/**
 * @description GitHub-contributions-style calendar heatmap. Renders weekday
 * rows × week columns of day cells, color-graded by relative daily count.
 * Framework-agnostic: takes a plain `{ date, count }[]` and an optional
 * `onSelectDate` for day click-through.
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
  const columns = React.useMemo(
    () => buildHeatmapColumns(values, endDate, weeks),
    [endDate, values, weeks],
  );

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
                      className="size-9"
                      key={cell.date}
                    />
                  );
                }

                const cellLabel = `${cell.count} ${cell.count === 1 ? 'contribution' : 'contributions'} on ${cell.date}`;

                return (
                  <button
                    aria-label={cellLabel}
                    className={cn(
                      'size-9 rounded-[2px] outline-none',
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
            className={cn('size-9 rounded-[2px]', levelClassName)}
            key={`legend-${level}`}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
