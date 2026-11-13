import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { GlobalTableCell } from '~/global/components/GlobalTableCell';
import type { GlobalDetailField } from '~/global/types/global-detail-list';

export interface GlobalDetailListProps<TRow extends object> {
  readonly className: string | undefined;
  readonly fields: readonly GlobalDetailField<TRow>[];
  readonly record: TRow;
}

/**
 * @description A definition list of label/value rows driven by declarative field config. Values
 * render through {@link GlobalTableCell}, so a record reads the same in detail and list views.
 */
export const GlobalDetailList = <TRow extends object>(
  props: GlobalDetailListProps<TRow>,
): React.ReactElement => {
  const { className, fields, record } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <dl
      className={cn(
        'grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2',
        className,
      )}
      data-testid="GlobalDetailList"
    >
      {fields.map((field) => (
        <React.Fragment key={field.key}>
          <dt className="text-muted-foreground text-sm">{field.label}</dt>
          <dd className="min-w-0 text-sm">
            <GlobalTableCell
              className={undefined}
              kind={field.kind}
              value={record[field.key]}
            />
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
};
