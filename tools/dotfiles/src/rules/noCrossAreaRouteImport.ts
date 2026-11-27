import * as path from 'node:path';

import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

/**
 * @description The no-cross-area-route-import rule: a React Router app's route
 * areas do not import each other (the ot-folders promotion ladder;
 * ot-code-review `place-05`). A file under `app/routing/<a>/` that imports
 * from `~/routing/<b>/`, or reaches it with a relative path, couples two areas
 * that change for different reasons; the shared piece belongs in
 * `app/global/<vocabulary>/` (or a package, once a second app needs it).
 *
 * Covers static imports, `export … from` and literal dynamic `import()`. A
 * file outside `app/routing/` is not checked.
 */

type MessageIds = 'crossArea';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/skills/ot-folders/SKILL.md#${name}`,
);

/** `<appRoot>/app/routing/<area>/…` → the app root and the area. */
const ROUTING_PATH = /^(.*\/app)\/routing\/([^/]+)\//;

/** `~/routing/<area>` or `~/routing/<area>/…`. */
const ALIASED_ROUTING = /^~\/routing\/([^/]+)(?:\/|$)/;

interface AreaLocation {
  readonly appRoot: string;
  readonly area: string;
}

/** @description The app root and route area a posix path sits in, if any. */
const areaOf = (posixPath: string): AreaLocation | null => {
  const match = ROUTING_PATH.exec(posixPath);
  if (match === null) return null;
  const [, appRoot, area] = match;
  if (appRoot === undefined || area === undefined) return null;
  return { appRoot, area };
};

/**
 * @description The area an import specifier targets in the importing file's
 * app, or null when it targets no route area.
 */
const targetAreaOf = (
  source: string,
  importer: AreaLocation,
  importerDir: string,
): string | null => {
  const aliased = ALIASED_ROUTING.exec(source);
  if (aliased !== null) return aliased[1] ?? null;
  if (!source.startsWith('.')) return null;

  const resolved = `${path.posix.resolve(importerDir, source)}/`;
  const target = areaOf(resolved);
  if (target === null || target.appRoot !== importer.appRoot) return null;
  return target.area;
};

export const noCrossAreaRouteImport = createRule<[], MessageIds>({
  create(context) {
    const filename = context.filename.split(path.sep).join('/');
    const importer = areaOf(filename);
    if (importer === null) return {};

    const importerDir = path.posix.dirname(filename);
    const check = (source: TSESTree.Node | null): void => {
      if (source?.type !== AST_NODE_TYPES.Literal) return;
      if (typeof source.value !== 'string') return;

      const target = targetAreaOf(source.value, importer, importerDir);
      if (target === null || target === importer.area) return;

      context.report({
        data: { from: importer.area, source: source.value, target },
        messageId: 'crossArea',
        node: source,
      });
    };

    return {
      ExportAllDeclaration(node): void {
        check(node.source);
      },
      ExportNamedDeclaration(node): void {
        check(node.source);
      },
      ImportDeclaration(node): void {
        check(node.source);
      },
      ImportExpression(node): void {
        check(node.source);
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Disallow a route area under \`app/routing/<a>/\` importing from another area \`~/routing/<b>/\`.`,
    },
    messages: {
      crossArea: `The \`{{from}}\` route area imports \`{{source}}\` from the \`{{target}}\` area. Areas do not import each other: promote the shared piece to \`app/global/<vocabulary>/\` (or a package once a second app needs it).`,
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'no-cross-area-route-import',
});
