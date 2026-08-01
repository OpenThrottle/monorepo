/** Supported column counts for the queue stat row grid. */
export type QueueStatRowColumns = 2 | 3 | 4 | 5;

/** Column count → responsive grid-template class. */
export const QUEUE_STAT_ROW_COLUMN_CLASS: Record<QueueStatRowColumns, string> =
  {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
  };
