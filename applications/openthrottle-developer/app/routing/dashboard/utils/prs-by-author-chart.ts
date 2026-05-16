import type { ChartConfig } from '@openthrottle/react-router-shadcn';

/** Recharts data keys for open vs closed PR counts per author. */
export const PRS_BY_AUTHOR_CHART_SERIES = ['closed', 'open'] as const;

export type PrsByAuthorChartSeriesKey =
  (typeof PRS_BY_AUTHOR_CHART_SERIES)[number];

/** One row per author: name plus open and closed counts for grouped bar charts. */
export interface PrsByAuthorChartDatum {
  readonly author: string;
  readonly closed: number;
  readonly open: number;
}

export const PRS_BY_AUTHOR_CHART_CONFIG: ChartConfig = {
  closed: { color: 'var(--chart-2)', label: 'Closed' },
  open: { color: 'var(--chart-1)', label: 'Open' },
};

interface PrCountByAuthorRow {
  readonly author: string;
  readonly openCount: number;
}

function totalPrsForChartRow(row: PrsByAuthorChartDatum): number {
  return row.open + row.closed;
}

/**
 * @description Merges open and closed PR-by-author series into chart rows, sorted by total PRs descending then author name.
 */
export function prsByAuthorToChartData(
  openPrCountByAuthor: ReadonlyArray<PrCountByAuthorRow>,
  closedPrCountByAuthor: ReadonlyArray<PrCountByAuthorRow>,
): PrsByAuthorChartDatum[] {
  const byAuthor = new Map<string, { closed: number; open: number }>();

  for (const row of openPrCountByAuthor) {
    const existing = byAuthor.get(row.author) ?? { closed: 0, open: 0 };
    byAuthor.set(row.author, { ...existing, open: row.openCount });
  }

  for (const row of closedPrCountByAuthor) {
    const existing = byAuthor.get(row.author) ?? { closed: 0, open: 0 };
    byAuthor.set(row.author, { ...existing, closed: row.openCount });
  }

  return [...byAuthor.entries()]
    .map(([author, counts]) => ({
      author,
      closed: counts.closed,
      open: counts.open,
    }))
    .sort((a, b) => {
      const totalDiff = totalPrsForChartRow(b) - totalPrsForChartRow(a);
      if (totalDiff !== 0) {
        return totalDiff;
      }
      return a.author.localeCompare(b.author);
    });
}
