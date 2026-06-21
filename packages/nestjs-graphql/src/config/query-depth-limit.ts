/**
 * @description Self-contained GraphQL query-depth limiting via a validation rule.
 *
 * A single deeply-nested or recursively-aliased query can fan out into an
 * expensive resolver storm (Postgres/Redis), so we cap the maximum selection-set
 * nesting depth at the validation stage — before any resolver runs. Implemented
 * with the `graphql` package primitives already in this package's dependency
 * tree, so no extra runtime dependency (e.g. `graphql-depth-limit`) is needed.
 */

import {
  GraphQLError,
  Kind,
  type ASTNode,
  type DefinitionNode,
  type FragmentDefinitionNode,
  type OperationDefinitionNode,
  type ValidationContext,
  type ValidationRule,
} from 'graphql';

/** Introspection meta-fields are exempt from depth counting (codegen/devtools). */
const isIntrospectionField = (name: string): boolean =>
  name === '__schema' || name === '__type' || name === '__typename';

/**
 * Walk a selection set, returning the deepest nesting depth reached. Fragment
 * spreads are resolved against the operation's fragment map; a `visited` set
 * guards against cyclic fragment references so traversal always terminates.
 */
function measureDepth(
  node: ASTNode,
  fragments: Readonly<Record<string, FragmentDefinitionNode>>,
  depthSoFar: number,
  visitedFragments: ReadonlySet<string>,
): number {
  switch (node.kind) {
    case Kind.FIELD: {
      if (isIntrospectionField(node.name.value) || !node.selectionSet) {
        return depthSoFar;
      }

      return node.selectionSet.selections.reduce(
        (max, selection) =>
          Math.max(
            max,
            measureDepth(
              selection,
              fragments,
              depthSoFar + 1,
              visitedFragments,
            ),
          ),
        depthSoFar,
      );
    }

    case Kind.FRAGMENT_SPREAD: {
      const fragmentName = node.name.value;

      if (visitedFragments.has(fragmentName)) {
        return depthSoFar;
      }

      const fragment = fragments[fragmentName];

      if (!fragment) {
        return depthSoFar;
      }

      const nextVisited = new Set(visitedFragments);

      nextVisited.add(fragmentName);

      return measureDepth(fragment, fragments, depthSoFar, nextVisited);
    }

    case Kind.INLINE_FRAGMENT:
    case Kind.FRAGMENT_DEFINITION:
    case Kind.OPERATION_DEFINITION: {
      const selectionSet = node.selectionSet;

      if (!selectionSet) {
        return depthSoFar;
      }

      return selectionSet.selections.reduce(
        (max, selection) =>
          Math.max(
            max,
            measureDepth(selection, fragments, depthSoFar, visitedFragments),
          ),
        depthSoFar,
      );
    }

    default:
      return depthSoFar;
  }
}

const isFragmentDefinition = (
  definition: DefinitionNode,
): definition is FragmentDefinitionNode =>
  definition.kind === Kind.FRAGMENT_DEFINITION;

const isOperationDefinition = (
  definition: DefinitionNode,
): definition is OperationDefinitionNode =>
  definition.kind === Kind.OPERATION_DEFINITION;

/**
 * Build a {@link ValidationRule} that rejects any operation whose selection-set
 * nesting exceeds `maxDepth`. A non-positive `maxDepth` disables the rule (it
 * reports nothing), so callers can opt out by passing `0` or a negative value.
 *
 * @publicApi
 * @param maxDepth Maximum allowed nesting depth (exclusive of the operation root).
 */
export function createQueryDepthLimitRule(maxDepth: number): ValidationRule {
  return (context: ValidationContext) => ({
    OperationDefinition(operationNode: OperationDefinitionNode) {
      if (maxDepth <= 0) {
        return;
      }

      const document = context.getDocument();
      const fragments: Record<string, FragmentDefinitionNode> = {};

      for (const definition of document.definitions) {
        if (isFragmentDefinition(definition)) {
          fragments[definition.name.value] = definition;
        }
      }

      const depth = measureDepth(operationNode, fragments, 0, new Set());

      if (depth > maxDepth) {
        const operationName = operationNode.name?.value ?? 'anonymous';

        context.reportError(
          new GraphQLError(
            `Query "${operationName}" exceeds maximum operation depth of ${maxDepth} (got ${depth}).`,
            { nodes: [operationNode] },
          ),
        );
      }
    },
  });
}

/** Re-export of the operation-definition guard for callers building rule sets. */
export { isOperationDefinition };
