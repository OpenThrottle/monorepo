import * as path from 'node:path';

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

/**
 * The data-file-shape rule: data files hold data
 * (docs/monorepo/code-style.md, "Data files hold data").
 *
 *   - A file directly under a `data/` folder is named `data.<name>.ts` — or
 *     `mock.<name>.ts` for a fixture, `.tsx` only when it needs JSX
 *     (`misnamed`).
 *   - It exports values, never functions. A merge, filter, formatter or row
 *     builder belongs in the sibling `utils/` (`exportsFunction`).
 *
 * Only the immediate parent folder counts: `data/fixtures/x.ts` is not a data
 * file. A `data/index.ts` barrel is exempt from the naming check — it
 * re-exports data files rather than being one — but not from the function
 * check. Tests, stories and declaration files are excluded by the consuming
 * config's `ignores`, not here.
 */

type MessageIds = 'exportsFunction' | 'misnamed';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#${name}`,
);

const CONFORMING_NAME = /^(?:data|mock)\.[a-z0-9]+(?:[.-][a-z0-9]+)*\.tsx?$/;

const BARREL_NAMES = ['index.ts', 'index.tsx'];

/**
 * @description The `data.<name>.ts` a misnamed file most likely means: the
 * stem with any `data`/`copy` affix already spelled into it dropped, so
 * `mcp-connectors.data.ts` suggests `data.mcp-connectors.ts`.
 */
const suggestName = (basename: string): string => {
  const extension = path.extname(basename);
  const stem = path
    .basename(basename, extension)
    .replace(/^data[.-]/, '')
    .replace(/[.-]data$/, '');
  return `data.${stem}${extension}`;
};

/**
 * @description Whether an expression is a function, looking through
 * `satisfies`, which leaves the value a function.
 */
const isFunctionExpression = (node: TSESTree.Node | null): boolean => {
  if (node === null) return false;
  if (node.type === AST_NODE_TYPES.TSSatisfiesExpression) {
    return isFunctionExpression(node.expression);
  }
  return (
    node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node.type === AST_NODE_TYPES.FunctionExpression
  );
};

/**
 * @description Whether a module-scope binding named `name` is a function — a
 * function declaration, or a `const` bound to one. Used for `export { fn }`
 * and `export default fn`.
 */
const isLocalFunction = (
  scope: TSESLint.Scope.Scope,
  name: string,
): boolean => {
  const variable = scope.set.get(name);
  if (variable === undefined) return false;
  return variable.defs.some((def) => {
    if (def.node.type === AST_NODE_TYPES.FunctionDeclaration) return true;
    if (def.node.type === AST_NODE_TYPES.TSDeclareFunction) return true;
    return (
      def.node.type === AST_NODE_TYPES.VariableDeclarator &&
      isFunctionExpression(def.node.init)
    );
  });
};

export const dataFileShape = createRule<[], MessageIds>({
  create(context) {
    const filename = context.filename;
    if (path.basename(path.dirname(filename)) !== 'data') return {};

    const basename = path.basename(filename);
    const reportFunction = (node: TSESTree.Node, name: string): void => {
      context.report({
        data: { basename, name },
        messageId: 'exportsFunction',
        node,
      });
    };

    return {
      ExportDefaultDeclaration(node): void {
        const declaration = node.declaration;
        if (
          declaration.type === AST_NODE_TYPES.FunctionDeclaration ||
          declaration.type === AST_NODE_TYPES.TSDeclareFunction
        ) {
          reportFunction(node, declaration.id?.name ?? 'default');
          return;
        }
        if (declaration.type === AST_NODE_TYPES.Identifier) {
          const scope = context.sourceCode.getScope(node);
          if (isLocalFunction(scope, declaration.name)) {
            reportFunction(node, declaration.name);
          }
          return;
        }
        if (isFunctionExpression(declaration)) {
          reportFunction(node, 'default');
        }
      },
      ExportNamedDeclaration(node): void {
        const declaration = node.declaration;
        if (
          declaration?.type === AST_NODE_TYPES.FunctionDeclaration ||
          declaration?.type === AST_NODE_TYPES.TSDeclareFunction
        ) {
          reportFunction(declaration, declaration.id?.name ?? 'default');
          return;
        }
        if (declaration?.type === AST_NODE_TYPES.VariableDeclaration) {
          for (const declarator of declaration.declarations) {
            if (
              declarator.id.type === AST_NODE_TYPES.Identifier &&
              isFunctionExpression(declarator.init)
            ) {
              reportFunction(declarator, declarator.id.name);
            }
          }
          return;
        }
        // `export { fn }` of a local function. A re-export (`from '…'`) names
        // another file, which is linted on its own.
        if (node.source !== null || node.exportKind === 'type') return;
        const scope = context.sourceCode.getScope(node);
        for (const specifier of node.specifiers) {
          if (specifier.exportKind === 'type') continue;
          if (specifier.local.type !== AST_NODE_TYPES.Identifier) continue;
          if (isLocalFunction(scope, specifier.local.name)) {
            reportFunction(specifier, specifier.local.name);
          }
        }
      },
      Program(program): void {
        if (CONFORMING_NAME.test(basename)) return;
        if (BARREL_NAMES.includes(basename)) return;
        context.report({
          data: { basename, expected: suggestName(basename) },
          loc: { column: 0, line: 1 },
          messageId: 'misnamed',
          node: program,
        });
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Name files directly under \`data/\` \`data.<name>.ts\` (or \`mock.<name>.ts\`) and keep functions out of them.`,
    },
    messages: {
      exportsFunction: `\`{{basename}}\` exports the function \`{{name}}\`. A data file holds values only — move the function to the sibling \`utils/\` folder.`,
      misnamed: `\`{{basename}}\` is directly under \`data/\`, so it is named \`data.<name>.ts\` (copy → \`data.copy.ts\`, fixtures → \`mock.<name>.ts\`, kebab-case) — e.g. \`{{expected}}\`.`,
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'data-file-shape',
});
