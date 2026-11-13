import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noTestSleep } from '../noTestSleep.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('no-test-sleep', noTestSleep, {
  invalid: [
    // The inline hand-rolled sleep.
    {
      code: 'await new Promise((resolve) => setTimeout(resolve, 50));',
      errors: [{ messageId: 'sleep' }],
    },
    // Block-bodied executor and a host-qualified timer.
    {
      code: 'await new Promise((r) => { globalThis.setTimeout(r, 10); });',
      errors: [{ messageId: 'sleep' }],
    },
    // `timers/promises`, under an alias.
    {
      code: "import { setTimeout as wait } from 'node:timers/promises';\nawait wait(100);",
      errors: [{ messageId: 'sleep' }],
    },
    // A same-file helper: the definition and every non-zero call.
    {
      code: [
        'const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));',
        'await sleep(40);',
        'await sleep(0);',
        'await sleep(4000);',
      ].join('\n'),
      errors: [
        { line: 1, messageId: 'sleep' },
        { data: { name: 'sleep' }, line: 2, messageId: 'sleepHelper' },
        { data: { name: 'sleep' }, line: 4, messageId: 'sleepHelper' },
      ],
    },
    {
      code: [
        'async function delay(ms: number) {',
        '  await new Promise((r) => setTimeout(r, ms));',
        '}',
        'await delay(300);',
      ].join('\n'),
      errors: [{ messageId: 'sleep' }, { messageId: 'sleepHelper' }],
    },
  ],
  valid: [
    // A tick flush is not a sleep.
    'await new Promise((r) => setTimeout(r, 0));',
    'await new Promise((r) => setTimeout(r));',
    "import { setTimeout } from 'node:timers/promises';\nawait setTimeout(0);",
    // A timer that is not a wait (e.g. a mock simulating slowness).
    'const handle = setTimeout(() => done(), 100);',
    // Under fake timers the wait is virtual.
    'vi.useFakeTimers();\nawait new Promise((r) => setTimeout(r, 4000));',
  ],
});
