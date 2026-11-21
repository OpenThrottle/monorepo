import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

/**
 * The prefer-graphql-fragment rule: type GraphQL data with the generated
 * `*Fragment` type, never by indexed access into a generated operation type
 * (docs/monorepo/code-style.md, "GraphQL data uses fragment types").
 *
 * It reports a type carved out of a `*Query` / `*Mutation` / `*Subscription`
 * type, whether it drills to a list element (`XQuery['field']['data'][number]`)
 * or stops short (`XQuery['field']['data']`). A fragment is the consumer's
 * stated data contract and keeps its shape when the query around it is
 * reshaped; an indexed type has no name of its own and silently follows the
 * query.
 *
 * Only identifiers whose imported name ends in `Query` / `Mutation` /
 * `Subscription`, imported from a `*-codegen` package or a `__generated__`
 * path, count — so an aliased import still does, and a local `SearchQuery`
 * does not. `NonNullable<…>` and `Exclude<…>` do not hide a chain, and each
 * chain is reported once, at its outermost access. Syntax-only, so lint needs
 * no type information.
 *
 * There is no autofix: the fix is a `.graphql` fragment plus a codegen run.
 *
 * Ported from Shiftsmart's `shiftsmart/prefer-graphql-fragment`.
 */

type MessageIds = 'preferFragment';

const OPERATION_NAME = /(Query|Mutation|Subscription)$/;

const CODEGEN_SOURCE = /(-codegen$|__generated__)/;

const UNWRAPPED_UTILITIES: ReadonlySet<string> = new Set([
  'Exclude',
  'NonNullable',
]);

const createRule = ESLintUtils.RuleCreator(() => {
  return 'https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#graphql-data-uses-fragment-types';
});

/**
 * @description True when `node` is a `NonNullable<…>` / `Exclude<…>` reference
 * the rule looks through.
 */
const isUnwrappedUtility = (node: TSESTree.Node): boolean => {
  return (
    node.type === AST_NODE_TYPES.TSTypeReference &&
    node.typeName.type === AST_NODE_TYPES.Identifier &&
    UNWRAPPED_UTILITIES.has(node.typeName.name)
  );
};

/**
 * @description Walks an indexed-access chain down to the type it starts from,
 * looking through nested indexed access and `NonNullable` / `Exclude`.
 */
const findRoot = (node: TSESTree.TypeNode): TSESTree.TypeNode => {
  if (node.type === AST_NODE_TYPES.TSIndexedAccessType) {
    return findRoot(node.objectType);
  }

  if (
    node.type === AST_NODE_TYPES.TSTypeReference &&
    isUnwrappedUtility(node)
  ) {
    const [inner] = node.typeArguments?.params ?? [];

    return inner === undefined ? node : findRoot(inner);
  }

  return node;
};

/**
 * @description True when `node` sits inside a larger indexed-access chain
 * (directly, or through a `NonNullable` / `Exclude` wrapper), so only the
 * outermost access of a chain reports.
 */
const isInnerLink = (node: TSESTree.Node): boolean => {
  const { parent } = node;

  if (parent === undefined) return false;

  if (parent.type === AST_NODE_TYPES.TSIndexedAccessType) {
    return parent.objectType === node || isInnerLink(parent);
  }

  if (parent.type === AST_NODE_TYPES.TSTypeParameterInstantiation) {
    const reference = parent.parent;

    return (
      isUnwrappedUtility(reference) &&
      parent.params[0] === node &&
      isInnerLink(reference)
    );
  }

  return false;
};

export const preferGraphqlFragment = createRule<[], MessageIds>({
  create(context) {
    const codegenOperations = new Set<string>();

    return {
      ImportDeclaration(node): void {
        if (!CODEGEN_SOURCE.test(node.source.value)) return;

        for (const specifier of node.specifiers) {
          // Match the exported name, so `import { XQuery as X }` still counts.
          if (
            specifier.type === AST_NODE_TYPES.ImportSpecifier &&
            specifier.imported.type === AST_NODE_TYPES.Identifier &&
            OPERATION_NAME.test(specifier.imported.name)
          ) {
            codegenOperations.add(specifier.local.name);
          }
        }
      },

      TSIndexedAccessType(node): void {
        if (isInnerLink(node)) return;

        const root = findRoot(node);

        if (
          root.type !== AST_NODE_TYPES.TSTypeReference ||
          root.typeName.type !== AST_NODE_TYPES.Identifier ||
          !codegenOperations.has(root.typeName.name)
        ) {
          return;
        }

        context.report({
          data: { name: root.typeName.name },
          messageId: 'preferFragment',
          node,
        });
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Type GraphQL data with generated fragment types instead of indexing into generated operation types.`,
    },
    messages: {
      preferFragment: `Don't derive a type by indexing into \`{{name}}\`. Add a fragment on the selected type in the \`.graphql\` document, run codegen, and import its generated \`<Name>Fragment\` type.`,
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'prefer-graphql-fragment',
});
