import type { DataSourceOptions } from 'typeorm';

/**
 * @description Outcome of `getCmsTypeOrmOptions`: the DataSource options, or
 * why none could be built.
 * @public
 */
export type CmsTypeOrmOptionsResult =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly options: DataSourceOptions };
