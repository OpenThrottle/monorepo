import type { TSESTree } from '@typescript-eslint/utils';

import {
  chainBaseName,
  createAntiFlakeRule,
  TEST_DEFINERS,
} from './anti-flake-shared.ts';

/**
 * The skip-requires-issue rule: an unconditional skip is a test nobody runs,
 * so it must say where the work to un-skip it is tracked.
 *
 * `it.skip` / `describe.skip` / `test.todo` (and `.skip.each`, `xit`,
 * `xdescribe`, `xtest`) need a comment on the line above, or at the end of the
 * line, citing an issue: `#123`, a GitHub `/issues/123` or `/pull/123` URL, or
 * an OpenThrottle plan/task UUID. Conditional `skipIf` / `runIf` are
 * environment gates, not parked work, and are allowed.
 */

type MessageIds = 'skipWithoutIssue';

const SKIP_PROPERTIES: ReadonlySet<string> = new Set(['skip', 'todo']);
const SKIP_ALIASES: ReadonlySet<string> = new Set([
  'xdescribe',
  'xit',
  'xtest',
]);

const ISSUE_REFERENCE =
  /#\d+|\/(?:issues|pull)\/\d+|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

/** @description The statement the skip belongs to, for comment lookup. */
const enclosingStatement = (node: TSESTree.Node): TSESTree.Node => {
  let current: TSESTree.Node = node;
  while (
    current.parent &&
    current.parent.type !== 'Program' &&
    current.parent.type !== 'BlockStatement'
  ) {
    current = current.parent;
  }
  return current;
};

export const skipRequiresIssue = createAntiFlakeRule<[], MessageIds>({
  create(context) {
    const { sourceCode } = context;

    const citesIssue = (node: TSESTree.Node): boolean => {
      const statement = enclosingStatement(node);
      const line = statement.loc.start.line;
      const comments = [
        ...sourceCode.getCommentsBefore(statement),
        ...sourceCode
          .getAllComments()
          .filter((comment) => comment.loc.start.line === line),
      ];
      return comments.some((comment) => ISSUE_REFERENCE.test(comment.value));
    };

    const check = (node: TSESTree.Node, reportOn: TSESTree.Node): void => {
      if (citesIssue(node)) return;
      context.report({ messageId: 'skipWithoutIssue', node: reportOn });
    };

    return {
      CallExpression(node): void {
        const { callee } = node;
        if (callee.type === 'Identifier' && SKIP_ALIASES.has(callee.name)) {
          check(node, callee);
        }
      },
      MemberExpression(node): void {
        if (
          node.computed ||
          node.property.type !== 'Identifier' ||
          !SKIP_PROPERTIES.has(node.property.name)
        ) {
          return;
        }
        const base = chainBaseName(node.object);
        if (base === null || !TEST_DEFINERS.has(base)) return;
        check(node, node.property);
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description:
        'Require an unconditional test skip or todo to cite the issue tracking it.',
    },
    messages: {
      skipWithoutIssue:
        'Skipped test without a tracking reference. Add a comment above citing an issue (`#123`) or an OpenThrottle plan/task id, or delete the test. Use `skipIf`/`runIf` for environment gates.',
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'skip-requires-issue',
});
