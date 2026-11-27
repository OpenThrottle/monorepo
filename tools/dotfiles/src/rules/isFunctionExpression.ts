import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

/**
 * @description Whether an expression is a function, looking through
 * `satisfies`, which leaves the value a function.
 */
export const isFunctionExpression = (node: TSESTree.Node | null): boolean => {
  if (node === null) return false;
  if (node.type === AST_NODE_TYPES.TSSatisfiesExpression) {
    return isFunctionExpression(node.expression);
  }
  return (
    node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node.type === AST_NODE_TYPES.FunctionExpression
  );
};
