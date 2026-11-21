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
 * It also keeps a fragment type the call site's own type:
 *
 * - **No indexing into a fragment** (`XFragment['items'][number]`). A child
 *   structure gets its own fragment, spread inside the parent's; a scalar or
 *   enum field uses its generated scalar or enum type.
 * - **No aliasing a fragment** — neither `type X = XFragment` (also wrapped
 *   in `NonNullable` / `Exclude` / arrays / `readonly` / `| null`) nor
 *   `import { XFragment as X }`. The call site names the fragment it uses.
 *
 * Only identifiers whose imported name ends in `Query` / `Mutation` /
 * `Subscription` (or `Fragment`), imported from a `*-codegen` package or a
 * `__generated__` path, count — so an aliased import still does, and a local
 * `SearchQuery` does not. `NonNullable<…>` and `Exclude<…>` do not hide a chain, and each
 * chain is reported once, at its outermost access. Syntax-only, so lint needs
 * no type information.
 *
 * There is no autofix: the fix is a `.graphql` fragment plus a codegen run.
 *
 * Ported from Shiftsmart's `shiftsmart/prefer-graphql-fragment`.
 */

type MessageIds = 'noFragmentAlias' | 'noFragmentIndexing' | 'preferFragment';

const OPERATION_NAME = /(Query|Mutation|Subscription)$/;

const FRAGMENT_NAME = /Fragment$/;

const CODEGEN_SOURCE = /(-codegen$|__generated__)/;

const UNWRAPPED_UTILITIES: ReadonlySet<string> = new Set([
  'Exclude',
  'NonNullable',
]);

/**
 * @description Wrappers a type alias may put around a fragment and still be
 * nothing but a rename of it.
 */
const ALIAS_WRAPPERS: ReadonlySet<string> = new Set([
  'Array',
  'Exclude',
  'NonNullable',
  'ReadonlyArray',
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

/**
 * @description The name of the codegen fragment `node` is a pure rename of —
 * the fragment itself, or it wrapped in {@link ALIAS_WRAPPERS}, an array,
 * `readonly`, or a union with `null` / `undefined` — or `undefined` when the
 * type says anything more than that.
 */
const findAliasedFragment = (
  node: TSESTree.TypeNode,
  fragments: ReadonlySet<string>,
): string | undefined => {
  if (node.type === AST_NODE_TYPES.TSTypeReference) {
    if (node.typeName.type !== AST_NODE_TYPES.Identifier) return undefined;

    const { name } = node.typeName;
    const params = node.typeArguments?.params ?? [];

    if (params.length === 0) {
      return fragments.has(name) ? name : undefined;
    }

    const [inner] = params;

    if (!ALIAS_WRAPPERS.has(name) || inner === undefined) return undefined;

    return findAliasedFragment(inner, fragments);
  }

  if (node.type === AST_NODE_TYPES.TSArrayType) {
    return findAliasedFragment(node.elementType, fragments);
  }

  if (
    node.type === AST_NODE_TYPES.TSTypeOperator &&
    node.operator === 'readonly' &&
    node.typeAnnotation !== undefined
  ) {
    return findAliasedFragment(node.typeAnnotation, fragments);
  }

  if (node.type === AST_NODE_TYPES.TSUnionType) {
    const members = node.types.filter((member) => {
      return (
        member.type !== AST_NODE_TYPES.TSNullKeyword &&
        member.type !== AST_NODE_TYPES.TSUndefinedKeyword
      );
    });
    const [only] = members;

    return members.length === 1 && only !== undefined
      ? findAliasedFragment(only, fragments)
      : undefined;
  }

  return undefined;
};

export const preferGraphqlFragment = createRule<[], MessageIds>({
  create(context) {
    const codegenOperations = new Set<string>();
    const codegenFragments = new Set<string>();

    return {
      ImportDeclaration(node): void {
        if (!CODEGEN_SOURCE.test(node.source.value)) return;

        for (const specifier of node.specifiers) {
          if (
            specifier.type !== AST_NODE_TYPES.ImportSpecifier ||
            specifier.imported.type !== AST_NODE_TYPES.Identifier
          ) {
            continue;
          }

          const imported = specifier.imported.name;

          // Match the exported name, so `import { XQuery as X }` still counts.
          if (OPERATION_NAME.test(imported)) {
            codegenOperations.add(specifier.local.name);
          }

          if (FRAGMENT_NAME.test(imported)) {
            codegenFragments.add(specifier.local.name);

            if (specifier.local.name !== imported) {
              context.report({
                data: { name: imported },
                messageId: 'noFragmentAlias',
                node: specifier,
              });
            }
          }
        }
      },

      TSIndexedAccessType(node): void {
        if (isInnerLink(node)) return;

        const root = findRoot(node);

        if (
          root.type !== AST_NODE_TYPES.TSTypeReference ||
          root.typeName.type !== AST_NODE_TYPES.Identifier
        ) {
          return;
        }

        const { name } = root.typeName;

        if (codegenOperations.has(name)) {
          context.report({ data: { name }, messageId: 'preferFragment', node });
        } else if (codegenFragments.has(name)) {
          context.report({
            data: { name },
            messageId: 'noFragmentIndexing',
            node,
          });
        }
      },

      TSTypeAliasDeclaration(node): void {
        const name = findAliasedFragment(node.typeAnnotation, codegenFragments);

        if (name === undefined) return;

        context.report({ data: { name }, messageId: 'noFragmentAlias', node });
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Type GraphQL data with generated fragment types, used directly: no indexing into generated operation or fragment types, and no aliasing a fragment type.`,
    },
    messages: {
      noFragmentAlias: `Don't alias \`{{name}}\`. Import the generated fragment type under its own name and use it directly at the call site.`,
      noFragmentIndexing: `Don't reach into \`{{name}}\` for a child type. Add a fragment on the child type, spread it inside the parent fragment, run codegen, and import its generated \`<Name>Fragment\` type (for a scalar or enum field, use its generated scalar or enum type).`,
      preferFragment: `Don't derive a type by indexing into \`{{name}}\`. Add a fragment on the selected type in the \`.graphql\` document, run codegen, and import its generated \`<Name>Fragment\` type.`,
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'prefer-graphql-fragment',
});
