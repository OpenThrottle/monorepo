/**
 * @public
 */
export interface CmsUuidRecord {
  readonly uuid: string;
}

/**
 * @description A comparator that sorts records into the order `reference` lists them by `uuid`.
 * Records absent from `reference` sort first, matching upstream.
 * @public
 */
export const getSortChildren = <TRecord extends CmsUuidRecord>(
  reference: readonly CmsUuidRecord[],
): ((a: TRecord, b: TRecord) => number) => {
  const indexOf = (record: CmsUuidRecord): number => {
    return reference.findIndex((child) => {
      return child.uuid === record.uuid;
    });
  };

  return (a, b) => {
    return indexOf(a) - indexOf(b);
  };
};
