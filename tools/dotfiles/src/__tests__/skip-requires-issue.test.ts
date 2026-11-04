import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { skipRequiresIssue } from '../rules/skip-requires-issue.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('skip-requires-issue', skipRequiresIssue, {
  invalid: [
    {
      code: "it.skip('renders', () => {});",
      errors: [{ messageId: 'skipWithoutIssue' }],
    },
    // A prose reason is not a tracking reference.
    {
      code: "// toolbar parked behind showToolbar=false\ndescribe.skip('toolbar', () => {});",
      errors: [{ messageId: 'skipWithoutIssue' }],
    },
    {
      code: "test.todo('handles the empty state');",
      errors: [{ messageId: 'skipWithoutIssue' }],
    },
    {
      code: "it.skip.each([1])('row %i', () => {});",
      errors: [{ messageId: 'skipWithoutIssue' }],
    },
    {
      code: "xit('legacy', () => {});",
      errors: [{ messageId: 'skipWithoutIssue' }],
    },
    // Nested inside a suite, the comment must sit above the skip itself.
    {
      code: "// #12\ndescribe('suite', () => {\n  it.skip('x', () => {});\n});",
      errors: [{ line: 3, messageId: 'skipWithoutIssue' }],
    },
  ],
  valid: [
    "// Flaky under CI load, see #412\nit.skip('renders', () => {});",
    "// https://github.com/OpenThrottle/monorepo/issues/412\nit.skip('x', () => {});",
    "// OT task 7b35217a-7bae-4abb-9ffa-e1b4523c5363\ndescribe.skip('x', () => {});",
    "it.skip('x', () => {}); // #99",
    "describe('suite', () => {\n  // #12\n  it.skip('x', () => {});\n});",
    // Environment gates are allowed.
    "it.skipIf(!process.env.DATABASE_URL)('x', () => {});",
    "describe.runIf(process.env.CI)('x', () => {});",
    // A runtime skip inside a test is not a parked test.
    "it('x', (context) => { context.skip(); });",
  ],
});
