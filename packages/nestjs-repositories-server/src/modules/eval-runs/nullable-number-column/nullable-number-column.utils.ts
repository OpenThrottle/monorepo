/**
 * @description Builds the TypeORM transformer for a nullable `numeric` column. Postgres returns
 * numeric as a string (to avoid precision loss). A cost fits comfortably in a JS number, so it is
 * read back as `number | null`; NULL stays NULL (unpriceable, not zero).
 */
export const nullableNumberColumn = (): {
  readonly from: (value: string | null) => number | null;
  readonly to: (value: number | null) => number | null;
} => {
  return {
    from: (value: string | null): number | null =>
      value == null ? null : Number(value),
    to: (value: number | null): number | null => value,
  };
};
