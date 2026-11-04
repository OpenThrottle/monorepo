/**
 * @description CLI entry point for the shared `graphql-schema` Nx target
 * (nx.json targetDefaults): emit or verify a code-first API's committed
 * schema.gql without booting it. See ./schema/graphql-schema-command.ts.
 *
 * Nx runs it with node directly so `--env-file` loads before the app's root
 * module is imported (some modules read the environment at import time):
 *   node --env-file=.env.default ./node_modules/@openthrottle/nestjs-graphql/dist/src/bin.js \
 *     --module=./build/src/app.module.js --project=<name> --schema=<root>/schema.gql --check
 */

import { runGraphqlSchemaCommand } from './schema/graphql-schema-command.ts';

process.exitCode = await runGraphqlSchemaCommand(
  process.argv.slice(2),
  process.env,
  process.cwd(),
);
