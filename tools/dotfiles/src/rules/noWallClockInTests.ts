import type { TSESTree } from '@typescript-eslint/utils';

import { createAntiFlakeRule, usesFakeClock } from './anti-flake-shared.ts';

/**
 * The no-wall-clock-in-tests rule: a test must not read the real clock.
 * `Date.now()`, `new Date()` / `Date()` with no argument and `performance.now()`
 * all make the result depend on when the suite runs — the classic New Year
 * boundary flake, or an elapsed-time assertion that fails on a loaded runner.
 *
 * Files that install a fake clock (`vi.useFakeTimers()` or
 * `vi.setSystemTime()`) are skipped: there these reads are deterministic.
 */

type MessageIds = 'wallClock';

const isMemberCall = (
  callee: TSESTree.Node,
  object: string,
  property: string,
): boolean => {
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === object &&
    callee.property.type === 'Identifier' &&
    callee.property.name === property
  );
};

const isBareDate = (node: TSESTree.Node): boolean => {
  return node.type === 'Identifier' && node.name === 'Date';
};

export const noWallClockInTests = createAntiFlakeRule<[], MessageIds>({
  create(context) {
    if (usesFakeClock(context.sourceCode.text)) return {};

    const report = (node: TSESTree.Node, read: string): void => {
      context.report({ data: { read }, messageId: 'wallClock', node });
    };

    return {
      CallExpression(node): void {
        if (isMemberCall(node.callee, 'Date', 'now')) {
          report(node, 'Date.now()');
        } else if (isMemberCall(node.callee, 'performance', 'now')) {
          report(node, 'performance.now()');
        } else if (isBareDate(node.callee) && node.arguments.length === 0) {
          report(node, 'Date()');
        }
      },
      NewExpression(node): void {
        if (isBareDate(node.callee) && node.arguments.length === 0) {
          report(node, 'new Date()');
        }
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Disallow reading the real clock in tests; use a fixed timestamp or vi.setSystemTime.`,
    },
    messages: {
      wallClock: `\`{{read}}\` reads the real clock, so the test depends on when it runs. Use a fixed timestamp constant (e.g. \`FIXED_NOW\`), or \`vi.useFakeTimers()\` + \`vi.setSystemTime()\`.`,
    },
    schema: [],
    type: 'problem',
  },
  name: 'no-wall-clock-in-tests',
});
