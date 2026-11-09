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
