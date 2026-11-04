/**
 * Where Nest writes the code-first SDL, and the one way to point it at a file.
 *
 * Kept free of imports on purpose: the `graphql-schema` command reads
 * {@link GRAPHQL_SCHEMA_FILE_ENV} and sets it BEFORE it imports the app's root
 * module, and importing the module file here would load the whole GraphQL
 * stack ahead of that.
 */

/**
 * Environment variable naming the file Nest should write the SDL to. Only the
 * `graphql-schema` command sets it; no Nx dev/start target does. Unset, the
 * schema stays in memory.
 *
 * @public
 */
export const GRAPHQL_SCHEMA_FILE_ENV = 'GRAPHQL_SCHEMA_FILE';

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
