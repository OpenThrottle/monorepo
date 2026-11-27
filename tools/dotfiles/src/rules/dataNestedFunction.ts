import * as path from 'node:path';

import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { isFunctionExpression } from './isFunctionExpression.ts';

/**
 * @description The data-nested-function rule: the objects and arrays in a data
 * file hold values, nested ones included (docs/monorepo/code-style.md, "Data
 * files hold data"). `data-file-shape` catches an exported function; this
 * catches the one wearing a data costume — `count: (n) => \`${n} rows\`` inside
 * a `data/copy.ts` object, or a method in a fixture. Copy with a variable is a
 * `{token}` template the caller fills with `fillTemplate`; logic goes to the
 * sibling `utils/`.
 *
 * Walks every module-scope `const` and `export default` whose value is an
 * object or array literal, through `as` / `satisfies`. Spread elements and
 * non-literal values are not followed. Only files directly under `data/` are
 * checked, as for `data-file-shape`.
 */

type MessageIds = 'nestedFunction';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#${name}`,
);

/**
 * @description The expression under any `as` / `satisfies` wrappers, which
 * leave a literal's shape unchanged.
 */
const unwrapExpression = (node: TSESTree.Node): TSESTree.Node => {
  if (
    node.type === AST_NODE_TYPES.TSAsExpression ||
    node.type === AST_NODE_TYPES.TSSatisfiesExpression
  ) {
    return unwrapExpression(node.expression);
  }
  return node;
};

/** @description The source-level name of a property key, for the reported path. */
const keyName = (property: TSESTree.Property): string => {
  if (property.computed) return '[…]';
  if (property.key.type === AST_NODE_TYPES.Identifier) return property.key.name;
  if (property.key.type === AST_NODE_TYPES.Literal) {
    return String(property.key.value);
  }
  return '[…]';
};

interface NestedFunction {
  readonly node: TSESTree.Node;
  readonly path: string;
}

/**
 * @description Every function or method nested inside an object or array
 * literal, with its path from `root` (`COPY.rows.count`, `ITEMS[2]`).
 */
const findNestedFunctions = (
  value: TSESTree.Node,
  root: string,
): readonly NestedFunction[] => {
  const node = unwrapExpression(value);

  if (node.type === AST_NODE_TYPES.ObjectExpression) {
    return node.properties.flatMap((property) => {
      if (property.type !== AST_NODE_TYPES.Property) return [];
      const keyPath = `${root}.${keyName(property)}`;
      if (property.method || isFunctionExpression(property.value)) {
        return [{ node: property, path: keyPath }];
      }
      return findNestedFunctions(property.value, keyPath);
    });
  }

  if (node.type === AST_NODE_TYPES.ArrayExpression) {
    return node.elements.flatMap((element, index) => {
      if (element === null) return [];
      if (element.type === AST_NODE_TYPES.SpreadElement) return [];
      const elementPath = `${root}[${index}]`;
      if (isFunctionExpression(element)) {
        return [{ node: element, path: elementPath }];
      }
      return findNestedFunctions(element, elementPath);
    });
  }

  return [];
};

export const dataNestedFunction = createRule<[], MessageIds>({
  create(context) {
    const filename = context.filename;
    if (path.basename(path.dirname(filename)) !== 'data') return {};

    const basename = path.basename(filename);
    const reportNested = (value: TSESTree.Node, root: string): void => {
      for (const nested of findNestedFunctions(value, root)) {
        context.report({
          data: { basename, path: nested.path },
          messageId: 'nestedFunction',
          node: nested.node,
        });
      }
    };

    return {
      'Program > ExportDefaultDeclaration'(
        node: TSESTree.ExportDefaultDeclaration,
      ): void {
        reportNested(node.declaration, 'default');
      },
      'Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator, Program > VariableDeclaration > VariableDeclarator'(
        node: TSESTree.VariableDeclarator,
      ): void {
        if (node.init === null) return;
        if (node.id.type !== AST_NODE_TYPES.Identifier) return;
        reportNested(node.init, node.id.name);
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Keep functions out of the objects and arrays in files directly under \`data/\`.`,
    },
    messages: {
      nestedFunction: `\`{{basename}}\` holds a function at \`{{path}}\`. A data file holds values only, nested ones included — move the logic to the sibling \`utils/\`, and write copy with a variable as a \`{token}\` template the caller fills with \`fillTemplate\`.`,
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'data-nested-function',
});
