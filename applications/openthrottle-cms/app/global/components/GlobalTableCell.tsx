import { Badge, cn } from '@openthrottle/react-router-shadcn';
import { format } from 'date-fns';
import * as React from 'react';

import {
  GLOBAL_TABLE_COLUMN_KIND,
  GLOBAL_TABLE_COPY,
} from '~/global/data/data.global-table';
import type { GlobalTableColumnKind } from '~/global/types/global-table';

export interface GlobalTableCellProps {
  readonly className: string | undefined;
  readonly kind: GlobalTableColumnKind;
  readonly value: unknown;
}

/**
 * @description Renders one `GlobalTable` cell value according to its column kind. A value the
 * kind cannot render (null, a wrong type, an invalid date) shows the missing placeholder.
 */
export const GlobalTableCell = (
  props: GlobalTableCellProps,
): React.ReactElement => {
  const { className, kind, value } = props;

  // Hooks

  // Setup
  const isText = typeof value === 'string' || typeof value === 'number';
  const date =
    typeof value === 'string' || value instanceof Date ? new Date(value) : null;
  const isValidDate = date !== null && !Number.isNaN(date.getTime());
  const list = Array.isArray(value)
    ? value.filter((item) => typeof item === 'string')
    : [];

  // Handlers

  // Markup
  const missing = (
    <span className={cn('text-muted-foreground', className)}>
      {GLOBAL_TABLE_COPY.missing}
    </span>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (kind === GLOBAL_TABLE_COLUMN_KIND.DATE) {
    if (!isValidDate) return missing;

    return (
      <time className={cn(className)} dateTime={date.toISOString()}>
        {format(date, 'MMM d, yyyy')}
      </time>
    );
  }

  if (kind === GLOBAL_TABLE_COLUMN_KIND.LIST) {
    if (list.length === 0) return missing;

    return (
      <div className={cn('flex flex-wrap gap-1', className)}>
        {list.map((item) => (
          <Badge key={item} size="xs" variant="outline">
            {item}
          </Badge>
        ))}
      </div>
    );
  }

  if (!isText || value === '') return missing;

  if (kind === GLOBAL_TABLE_COLUMN_KIND.BADGE) {
    return (
      <Badge className={cn(className)} size="xs" variant="outline">
        {String(value)}
      </Badge>
    );
  }

  if (kind === GLOBAL_TABLE_COLUMN_KIND.CODE) {
    return (
      <code className={cn('font-mono text-xs', className)}>
        {String(value)}
      </code>
    );
  }

  return <span className={cn(className)}>{String(value)}</span>;
};
