import type {
  ExpandedState,
  OnChangeFn,
  RowData,
  TableOptions,
} from '@tanstack/react-table';

import type { DataTableFeatures } from './dataTableFeatures';

export type ExpansionOptions<TData extends RowData> = Partial<
  Pick<
    TableOptions<DataTableFeatures, TData>,
    'getSubRows' | 'onExpandedChange' | 'state'
  >
>;

export interface GetExpansionOptionsInput<TData extends RowData> {
  readonly expandedState: ExpandedState;
  readonly getSubRows:
    ((original: TData, index: number) => TData[] | undefined) | undefined;
  readonly onExpandedChange: OnChangeFn<ExpandedState>;
}

/**
 * @description Table options that opt a table into nested, expandable rows.
 * Returns an empty object when no `getSubRows` is supplied, so the table
 * options stay identical to the flat table.
 */
export const getExpansionOptions = <TData extends RowData>(
  input: GetExpansionOptionsInput<TData>,
): ExpansionOptions<TData> => {
  const { expandedState, getSubRows, onExpandedChange } = input;

  if (!getSubRows) return {};

  return {
    getSubRows,
    onExpandedChange,
    state: { expanded: expandedState },
  };
};
