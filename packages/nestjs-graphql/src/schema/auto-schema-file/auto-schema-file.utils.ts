import { GRAPHQL_SCHEMA_FILE_ENV } from './auto-schema-file.constants.ts';

/**
 * The `autoSchemaFile` option for the app's GraphQLModule: the file named by
 * {@link GRAPHQL_SCHEMA_FILE_ENV}, or `true` (build the schema in memory, write
 * nothing) when it is unset or empty. A boot never writes a file, in any
 * environment, so only `graphql-schema:write` produces the committed
 * `schema.gql`: a boot orders types differently from that command, so a
 * boot-written file churned the diff and failed `graphql-schema:check`, and the
 * production image's read-only root filesystem cannot take the write at all
 * (EROFS crashed boot).
 *
 * @public
 */
export function resolveAutoSchemaFile(
  env: NodeJS.ProcessEnv = process.env,
): string | true {
  const file = env[GRAPHQL_SCHEMA_FILE_ENV];

  return file ? file : true;
}
