import type { TSESTree } from '@typescript-eslint/utils';

import {
  createAntiFlakeRule,
  isFunctionLike,
  usesFakeTimers,
} from './anti-flake-shared.ts';

/**
 * The no-test-sleep rule: a test must not wait on the real clock.
 *
 *   - `new Promise((r) => setTimeout(r, N))` — the hand-rolled sleep.
 *   - `await setTimeout(N)` from `timers/promises`.
 *   - A call to a same-file helper wrapping either (`await sleep(50)`), so the
 *     burn-down count is every wait, not just every helper.
 *
 * A delay of `0` (or none) is a tick flush, not a sleep, and is allowed. Files
 * that call `vi.useFakeTimers()` are skipped: there the wait is virtual.
 */

type MessageIds = 'sleep' | 'sleepHelper';

const TIMER_HOSTS: ReadonlySet<string> = new Set([
  'global',
  'globalThis',
  'window',
]);
const TIMERS_PROMISES: ReadonlySet<string> = new Set([
  'node:timers/promises',
  'timers/promises',
]);

const isZeroOrAbsent = (arg: TSESTree.Node | undefined): boolean => {
  return arg === undefined || (arg.type === 'Literal' && arg.value === 0);
};

const isGlobalSetTimeout = (callee: TSESTree.Node): boolean => {
  if (callee.type === 'Identifier') return callee.name === 'setTimeout';
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    TIMER_HOSTS.has(callee.object.name) &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'setTimeout'
  );
};

const enclosingFunction = (node: TSESTree.Node): TSESTree.Node | null => {
  let current = node.parent;
  while (current) {
    if (isFunctionLike(current) || current.type === 'FunctionDeclaration') {
      return current;
    }
    current = current.parent;
  }
  return null;
};

const isPromiseExecutor = (fn: TSESTree.Node | null): boolean => {
  const parent = fn?.parent;
  return (
    parent?.type === 'NewExpression' &&
    parent.callee.type === 'Identifier' &&
    parent.callee.name === 'Promise' &&
    parent.arguments[0] === fn
  );
};

/** @description The binding name of a named helper function, if any. */
const helperName = (fn: TSESTree.Node | null): string | null => {
  if (fn?.type === 'FunctionDeclaration') return fn.id?.name ?? null;
  const parent = fn?.parent;
  if (
    fn !== null &&
    parent?.type === 'VariableDeclarator' &&
    parent.init === fn &&
    parent.id.type === 'Identifier'
  ) {
    return parent.id.name;
  }
  return null;
};

export const noTestSleep = createAntiFlakeRule<[], MessageIds>({
  create(context) {
    if (usesFakeTimers(context.sourceCode.text)) return {};

    const timersPromisesNames = new Set<string>();
    const helpers = new Set<string>();
    const identifierCalls: TSESTree.CallExpression[] = [];

    const recordSleep = (node: TSESTree.CallExpression): void => {
      context.report({ messageId: 'sleep', node });
      // The function the wait lives in: the one wrapping the `new Promise`,
      // or the one awaiting `timers/promises` directly.
      const holder = enclosingFunction(node);
      const wrapper = isPromiseExecutor(holder)
        ? enclosingFunction(holder ?? node)
        : holder;
      const name = helperName(wrapper);
      if (name !== null) helpers.add(name);
    };

    return {
      CallExpression(node): void {
        const { callee } = node;
        if (callee.type === 'Identifier') identifierCalls.push(node);

        if (
          callee.type === 'Identifier' &&
          timersPromisesNames.has(callee.name)
        ) {
          if (!isZeroOrAbsent(node.arguments[0])) recordSleep(node);
          return;
        }

        if (
          isGlobalSetTimeout(callee) &&
          !isZeroOrAbsent(node.arguments[1]) &&
          isPromiseExecutor(enclosingFunction(node))
        ) {
          recordSleep(node);
        }
      },
      ImportDeclaration(node): void {
        if (!TIMERS_PROMISES.has(node.source.value)) return;
        for (const specifier of node.specifiers) {
          if (
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.type === 'Identifier' &&
            specifier.imported.name === 'setTimeout'
          ) {
            timersPromisesNames.add(specifier.local.name);
          }
        }
      },
      'Program:exit'(): void {
        for (const call of identifierCalls) {
          if (
            call.callee.type === 'Identifier' &&
            helpers.has(call.callee.name) &&
            !isZeroOrAbsent(call.arguments[0])
          ) {
            context.report({
              data: { name: call.callee.name },
              messageId: 'sleepHelper',
              node: call,
            });
          }
        }
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Disallow real-clock sleeps in tests; use fake timers, vi.waitFor or expect.poll.`,
    },
    messages: {
      sleep: `Real-clock sleep in a test. Use \`vi.useFakeTimers()\` + \`vi.advanceTimersByTimeAsync()\`, or \`vi.waitFor\` / \`expect.poll\` when waiting on a real event.`,
      sleepHelper: `\`{{name}}()\` sleeps on the real clock. Use \`vi.useFakeTimers()\` + \`vi.advanceTimersByTimeAsync()\`, or \`vi.waitFor\` / \`expect.poll\` when waiting on a real event.`,
    },
    schema: [],
    type: 'problem',
  },
  name: 'no-test-sleep',
});
