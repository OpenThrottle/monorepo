/**
 * @description Builds TypeORM DataSource options for the `cms` database.
 * Used by NestjsRepositoriesCmsModule to register its named connection.
 */

import { getCmsPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';

import { CMS_CONNECTION } from './config/config.constants.ts';
import { Fragment } from './modules/fragments/fragment.entity.ts';
import { FragmentChild } from './modules/fragments-children/fragment-child.entity.ts';
import { Layout } from './modules/layouts/layout.entity.ts';
import { LayoutLibrary } from './modules/layouts-libraries/layout-library.entity.ts';
import { Library } from './modules/libraries/library.entity.ts';
import { LibraryComponent } from './modules/library-components/library-component.entity.ts';
import { Profile } from './modules/profiles/profile.entity.ts';
import { Schema } from './modules/schemas/schema.entity.ts';
import { Survey } from './modules/surveys/survey.entity.ts';
import { Tag } from './modules/tags/tag.entity.ts';
import type { CmsTypeOrmOptionsResult } from './nestjs-repositories-cms.types.ts';

/**
 * @description Resolves a positive integer from an env var, or undefined when
 * unset/blank/invalid. Used for the optional slow-query threshold.
 */
function parsePositiveIntEnv(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

/**
 * @description Returns TypeORM DataSource options for the `cms` database, or
 * an error when no connection is configured. The SQL migrations under
 * `databases/cms/migrations` own the schema, so `synchronize` is off and no
 * TypeORM migrations run. `POSTGRES_SLOW_QUERY_MS` sets
 * `maxQueryExecutionTime`, as in `@openthrottle/nestjs-repositories`.
 * @public
 */
export function getCmsTypeOrmOptions(
  env: NodeJS.ProcessEnv = process.env,
): CmsTypeOrmOptionsResult {
  const url = getCmsPostgresUrl(env);
  if (!url.ok) {
    return url;
  }

  const slowQueryMs = parsePositiveIntEnv(env.POSTGRES_SLOW_QUERY_MS);

  return {
    ok: true,
    options: {
      entities: [
        Fragment,
        FragmentChild,
        Layout,
        LayoutLibrary,
        Library,
        LibraryComponent,
        Profile,
        Schema,
        Survey,
        Tag,
      ],
      logger: 'advanced-console',
      logging: ['error', 'warn', 'info'],
      ...(slowQueryMs != null && { maxQueryExecutionTime: slowQueryMs }),
      migrations: [],
      migrationsRun: false,
      name: CMS_CONNECTION,
      synchronize: false,
      type: 'postgres',
      url: url.url,
    },
  };
}
