import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { selectValueChildren } from '../selectValueChildren.ts';

// Wire the framework hooks the RuleTester calls to Vitest's.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('select-value-children', selectValueChildren, {
  invalid: [
    // A controlled Select with a self-closing SelectValue.
    {
      code: [
        '<Select value={sort}>',
        '  <SelectTrigger>',
        '    <SelectValue placeholder="Sort" />',
        '  </SelectTrigger>',
        '</Select>;',
      ].join('\n'),
      errors: [{ line: 3, messageId: 'childless' }],
    },
    // defaultValue counts too, and whitespace between the tags is not a child.
    {
      code: [
        '<Select defaultValue="a">',
        '  <SelectTrigger>',
        '    <SelectValue>',
        '    </SelectValue>',
        '  </SelectTrigger>',
        '</Select>;',
      ].join('\n'),
      errors: [{ line: 3, messageId: 'childless' }],
    },
    // Found through a fragment and a conditional wrapper element.
    {
      code: [
        '<Select value={v}>',
        '  <>',
        '    <div><SelectTrigger><SelectValue /></SelectTrigger></div>',
        '  </>',
        '</Select>;',
      ].join('\n'),
      errors: [{ line: 3, messageId: 'childless' }],
    },
  ],
  valid: [
    // The fix: the selected label as children.
    '<Select value={sort}><SelectTrigger><SelectValue placeholder="Sort">{label}</SelectValue></SelectTrigger></Select>;',
    // An uncontrolled Select starts on its placeholder.
    '<Select><SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger></Select>;',
    // A SelectValue outside any Select is not this rule's business.
    '<SelectTrigger><SelectValue /></SelectTrigger>;',
    // A nested uncontrolled Select owns its own SelectValue.
    '<Select value={v}><SelectTrigger><SelectValue>{label}</SelectValue></SelectTrigger><Select><SelectValue /></Select></Select>;',
    // Member names (the Radix primitive itself) are not matched.
    '<SelectPrimitive.Root value={v}><SelectPrimitive.Value /></SelectPrimitive.Root>;',
  ],
});
