/** A single day's value in the heatmap. `date` is an ISO `YYYY-MM-DD` string. */
export interface ContributionHeatmapValue {
  readonly count: number;
  readonly date: string;
}

/** Intensity levels: index 0 is "empty", 1–4 ramp from light to full. */
export const LEVEL_CLASSNAMES: ReadonlyArray<string> = [
  'bg-muted',
  'bg-primary/25',
  'bg-primary/45',
  'bg-primary/70',
  'bg-primary',
];

export const WEEKDAY_LABELS: ReadonlyArray<string> = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

/** Weekday rows that render a label on the left rail (Mon / Wed / Fri). */
export const LABELED_WEEKDAY_ROWS: ReadonlyArray<number> = [1, 3, 5];

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
export const DEFAULT_WEEKS = 26;

export interface HeatmapCell {
  readonly count: number;
  readonly date: string;
  /** true for future days past `endDate` — rendered as an inert placeholder. */
  readonly isPlaceholder: boolean;
  readonly level: number;
}

export interface HeatmapColumn {
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
 * Build the week-column grid for the heatmap: `weeks` columns × 7 weekday rows
 * of day cells, color-graded by relative daily count. The right-most column
 * ends on the Saturday of `endDate`'s week; future days render as placeholders.
 */
export function buildHeatmapColumns(
  values: ReadonlyArray<ContributionHeatmapValue>,
  endDate: string | undefined,
  weeks: number,
): ReadonlyArray<HeatmapColumn> {
  const countByDate = new Map<string, number>();
  let max = 0;
  for (const value of values) {
    countByDate.set(value.date, value.count);
    if (value.count > max) {
      max = value.count;
    }
  }

  const end = endDate != null ? parseYmd(endDate) : parseYmd(toYmd(new Date()));
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
}
