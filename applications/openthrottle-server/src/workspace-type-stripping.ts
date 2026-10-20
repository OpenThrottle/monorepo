import { readFileSync } from 'node:fs';
import type { LoadFnOutput, ModuleSource } from 'node:module';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';

/**
 * @description The JavaScript format each TypeScript format becomes once its types are stripped.
 */
const STRIPPED_FORMATS = {
  'commonjs-typescript': 'commonjs',
  'module-typescript': 'module',
} as const;

type TypeScriptFormat = keyof typeof STRIPPED_FORMATS;

/**
 * @description Matches a workspace package as `pnpm deploy` lays it out in the production image:
 * `/app/node_modules/.pnpm/<id>/node_modules/@openthrottle/<name>/src/…`. Third-party packages
 * that ship `.ts` are deliberately left to Node's refusal — only our own source is stripped.
 */
const WORKSPACE_PACKAGE_UNDER_NODE_MODULES =
  /\/node_modules\/@(?:openthrottle|tools)\//;

const isTypeScriptFormat = (
  format: LoadFnOutput['format'],
): format is TypeScriptFormat =>
  format === 'commonjs-typescript' || format === 'module-typescript';

const decodeSource = (
  url: string,
  source: ModuleSource | undefined,
): string => {
  if (typeof source === 'string') {
    return source;
  }

  return source === undefined
    ? readFileSync(fileURLToPath(url), 'utf8')
    : new TextDecoder().decode(source);
};

/**
 * @description Strip types from a workspace package's TypeScript source when it is loaded from
 * under `node_modules`, and pass every other module through untouched.
 *
 * Source-first workspace packages point `exports` at `src/*.ts`. In development that resolves
 * through pnpm's workspace symlink to `packages/<name>/src`, which Node type-strips natively. In
 * the production image `pnpm deploy` copies the same package under `node_modules`, where Node
 * refuses to strip types (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`) — so the image crashed
 * at its first import while dev worked. Stripping here, in `'strip'` mode, runs exactly the code
 * dev runs: no transform dev does not also apply.
 * @param url - The resolved module URL.
 * @param loaded - The result of the default (next) load hook.
 * @returns The load result, with stripped JavaScript in place of workspace TypeScript.
 */
export const stripWorkspaceTypes = (
  url: string,
  loaded: LoadFnOutput,
): LoadFnOutput => {
  const { format } = loaded;

  if (
    !isTypeScriptFormat(format) ||
    !WORKSPACE_PACKAGE_UNDER_NODE_MODULES.test(url)
  ) {
    return loaded;
  }

  return {
    ...loaded,
    format: STRIPPED_FORMATS[format],
    source: stripTypeScriptTypes(decodeSource(url, loaded.source), {
      mode: 'strip',
    }),
  };
};
