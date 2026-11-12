import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noWallClockInTests } from '../rules/no-wall-clock-in-tests.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('no-wall-clock-in-tests', noWallClockInTests, {
  invalid: [
    {
      code: 'const started = Date.now();',
      errors: [{ data: { read: 'Date.now()' }, messageId: 'wallClock' }],
    },
    {
      code: 'const fixture = { createdAt: new Date() };',
      errors: [{ data: { read: 'new Date()' }, messageId: 'wallClock' }],
    },
    {
      code: 'const label = Date();',
      errors: [{ data: { read: 'Date()' }, messageId: 'wallClock' }],
    },
    {
      code: 'const t0 = performance.now();',
      errors: [{ data: { read: 'performance.now()' }, messageId: 'wallClock' }],
    },
  ],
  valid: [
    // A fixed timestamp is deterministic.
    "const FIXED_NOW = new Date('2026-01-01T00:00:00Z');",
    'const fromEpoch = new Date(0);',
    'const parsed = Date.parse(value);',
    // A fake clock makes the reads deterministic.
    'vi.useFakeTimers();\nconst now = Date.now();',
    "vi.setSystemTime(new Date('2026-01-01'));\nconst now = new Date();",
  ],
});
