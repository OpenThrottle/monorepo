import type { TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * The pre-Hooks unpack checker — the shared, surface-agnostic implementation of
 * the "unpack `props` before `// Hooks`" contract
 * (docs/monorepo/component-primitive-shape.md, "The pre-Hooks unpack block";
 * route-primitive-shape.md R2 aliases it).
 *
 * The abstract rule is a single idea: an **identity ObjectPattern unpack** of
 * `props`, or of a binding previously taken from `props`, must live in the
 * pre-Hooks block — between the signature and the first `// Hooks` marker — not
 * after it. Route keys (`loaderData` / `actionData` / `params` / `matches`)
 * fall out of walking nested unpacks; they are **not** a special case, so this
 * one walk covers both authored components (`FooProps`) and route default
 * Components (`Route.ComponentProps`).
 *
 * `findPropsUnpacksAfterHooks` is intentionally decoupled from ESLint's
 * `SourceCode` (it takes the parsed comment list) so it can be unit-tested with
 * a bare parse. The `preHooksUnpack` rule below is the single ESLint wrapper;
 * it is wired at `warn` on both the component and route file globs.
 */

/** A render function whose body may carry the six-marker shape. */
export type RenderFunction =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression;

/**
 * Collect every leaf identifier bound by a destructuring target — object/array
 * patterns, renamed and defaulted properties, rest elements, and nesting. Used
 * to extend the props-derived name set as each identity unpack is walked, so a
 * nested chain (`const { loaderData } = props; const { repository } =
 * loaderData;`) is followed to any depth.
 */
const collectBoundNames = (
  target: TSESTree.DestructuringPattern | TSESTree.Node,
  out: Set<string>,
): void => {
  switch (target.type) {
    case 'Identifier':
      out.add(target.name);
      return;
    case 'AssignmentPattern':
      collectBoundNames(target.left, out);
      return;
    case 'RestElement':
      collectBoundNames(target.argument, out);
      return;
    case 'ArrayPattern':
      for (const element of target.elements) {
        if (element !== null) collectBoundNames(element, out);
      }
      return;
    case 'ObjectPattern':
      for (const property of target.properties) {
        if (property.type === 'RestElement') {
          collectBoundNames(property.argument, out);
        } else {
          collectBoundNames(property.value, out);
        }
      }
      return;
    default:
      return;
  }
};

/**
 * Given a render function and the file's parsed comments, return the identity
 * `props` unpacks (as their `VariableDeclarator`s) that appear **after** the
 * first `// Hooks` marker in the function body. Empty when the body has no
 * `// Hooks` marker (nothing to anchor against) or no first-parameter binding.
 */
export const findPropsUnpacksAfterHooks = (
  fn: RenderFunction,
  comments: readonly TSESTree.Comment[],
): TSESTree.VariableDeclarator[] => {
  if (fn.body.type !== 'BlockStatement') return [];
  const body = fn.body;

  // Anchor: the first `// Hooks` line comment inside this function body.
  const hooksComment = comments.find(
    (comment) =>
      comment.type === 'Line' &&
      comment.value.trim() === 'Hooks' &&
      comment.range[0] > body.range[0] &&
      comment.range[1] < body.range[1],
  );
  if (hooksComment === undefined) return [];
  const hooksStart = hooksComment.range[0];

  // Seed the props-derived set with the first parameter when it is a plain
  // identifier (`props`) — the source every unpack chain flows from. Both the
  // component (`props: FooProps`) and route (`props: Route.ComponentProps`)
  // render functions use it.
  const propsDerived = new Set<string>();
  const firstParam = fn.params[0];
  if (firstParam !== undefined && firstParam.type === 'Identifier') {
    propsDerived.add(firstParam.name);
  }
  if (propsDerived.size === 0) return [];

  const findings: TSESTree.VariableDeclarator[] = [];

  // Walk the body's top-level declarations in source order so nested unpacks
  // propagate: an identity unpack extends the props-derived set whether it sits
  // before or after `// Hooks`, but only ones after the marker are flagged.
  for (const statement of body.body) {
    if (statement.type !== 'VariableDeclaration') continue;
    for (const declarator of statement.declarations) {
      const isIdentityUnpack =
        declarator.id.type === 'ObjectPattern' &&
        declarator.init !== null &&
        declarator.init.type === 'Identifier' &&
        propsDerived.has(declarator.init.name);
      if (!isIdentityUnpack) continue;

      collectBoundNames(declarator.id, propsDerived);
      if (declarator.range[0] > hooksStart) findings.push(declarator);
    }
  }

  return findings;
};

const OPT_OUT = /(?:component|route)-shape:\s*opt-out/;

const createRule = ESLintUtils.RuleCreator(
  () =>
    'https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/component-primitive-shape.md#the-pre-hooks-unpack-block',
);

/**
 * `openthrottle/pre-hooks-unpack` — the single ESLint rule backed by
 * `findPropsUnpacksAfterHooks`, applied to both the authored-component and the
 * route-module globs (see `eslintConfig`). Shipped **warn-first** on both
 * surfaces; graduation to `error` is a follow-up, and may happen per-surface.
 * Honors the same first-line `component-shape` / `route-shape` opt-out pragma
 * the sibling shape rules use.
 */
export const preHooksUnpack = createRule<[], 'unpackAfterHooks'>({
  create(context) {
    const sourceCode = context.sourceCode;

    const firstComment = sourceCode.getAllComments()[0];
    if (
      firstComment &&
      firstComment.type === 'Block' &&
      firstComment.loc.start.line === 1 &&
      OPT_OUT.test(firstComment.value)
    ) {
      return {};
    }

    const check = (fn: RenderFunction): void => {
      for (const declarator of findPropsUnpacksAfterHooks(
        fn,
        sourceCode.ast.comments,
      )) {
        context.report({ messageId: 'unpackAfterHooks', node: declarator.id });
      }
    };

    return {
      ArrowFunctionExpression: check,
      FunctionDeclaration: check,
      FunctionExpression: check,
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description:
        'Unpack `props` (and nested identity destructures of props-derived bindings) in the pre-Hooks block, not after `// Hooks`.',
    },
    messages: {
      unpackAfterHooks:
        'Unpack `props` (and nested identity destructures of props-derived bindings) in the pre-Hooks block, above `// Hooks` — not here, and never after `// 🔌 Short Circuit`. See the pre-Hooks unpack block in component-primitive-shape.md (route R2 aliases it).',
    },
    schema: [],
    type: 'problem',
  },
  name: 'pre-hooks-unpack',
});
