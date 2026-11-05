import {
  type ExpandedState,
  getExpandedRowModel,
  type OnChangeFn,
  type TableOptions,
} from '@tanstack/react-table';

export type ExpansionOptions<TData> = Partial<
  Pick<
    TableOptions<TData>,
    'getExpandedRowModel' | 'getSubRows' | 'onExpandedChange' | 'state'
  >
>;

export interface GetExpansionOptionsInput<TData> {
  readonly expandedState: ExpandedState;
  readonly getSubRows:
    ((original: TData, index: number) => TData[] | undefined) | undefined;
  readonly onExpandedChange: OnChangeFn<ExpandedState>;
}

/**
 * @description Table options that opt a table into the expanded row model.
 * Returns an empty object when no `getSubRows` is supplied, so the table
 * options stay identical to the flat table.
 */
export const getExpansionOptions = <TData>(
  input: GetExpansionOptionsInput<TData>,
): ExpansionOptions<TData> => {
  const { expandedState, getSubRows, onExpandedChange } = input;

  if (!getSubRows) return {};

  return {
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows,
    onExpandedChange,
    state: { expanded: expandedState },
  };
};
