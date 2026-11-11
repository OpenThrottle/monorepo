/**
 * @description Name of the TypeORM DataSource for the `cms` database. Feature
 * modules pass it to `TypeOrmModule.forFeature([...], CMS_CONNECTION)` and
 * `@InjectRepository(Entity, CMS_CONNECTION)`; it keeps the cms DataSource
 * apart from the default (openthrottle) one in the same app.
 * @public
 */
export const CMS_CONNECTION = 'cms';

/**
 * @description Values of the cms status enums. `schema_status`,
 * `layout_status`, `library_status` and `library_component_status`
 * (databases/cms/migrations 001, 004, 008, 009) are separate Postgres types
 * with the same three labels; new rows default to `DRAFT`.
 * @public
 */
export const CMS_STATUS = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
  DRAFT: 'DRAFT',
} as const;

/**
 * @description {@link CMS_STATUS} as a list, for TypeORM enum columns.
 * @public
 */
export const CMS_STATUS_VALUES = Object.values(CMS_STATUS);
