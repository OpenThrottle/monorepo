import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noHandRolledTemplateFill } from '../noHandRolledTemplateFill.ts';

// Wire the framework hooks the RuleTester calls to Vitest's.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('no-hand-rolled-template-fill', noHandRolledTemplateFill, {
  invalid: [
    {
      code: `const text = template.replace('{used}', used);`,
      errors: [{ messageId: 'handRolledFill' }],
    },
    {
      code: `const text = template.replaceAll("{slug}", slug);`,
      errors: [{ messageId: 'handRolledFill' }],
    },
    // A chain reports once per call.
    {
      code: `const text = template.replace('{a}', a).replace('{b}', b);`,
      errors: [
        { messageId: 'handRolledFill' },
        { messageId: 'handRolledFill' },
      ],
    },
    // A template-literal-free copy constant is still a copy string.
    {
      code: `const text = COPY.ariaLabel.replace('{percent}', percent);`,
      errors: [{ messageId: 'handRolledFill' }],
    },
  ],
  valid: [
    // A regex is not a template fill.
    `const text = template.replace(/\\{used\\}/g, used);`,
    // Not a bare placeholder.
    `const text = path.replace('/', '-');`,
    `const text = template.replace('{ spaced }', value);`,
    `const text = template.replace('prefix {used}', value);`,
    `const text = template.replace('{}', value);`,
    // Other methods and computed access.
    `const text = template.split('{used}').join(value);`,
    `const text = template['replace']('{used}', value);`,
    // A function, not a method call.
    `const text = replace('{used}', value);`,
    // No arguments, or a non-literal first argument.
    `const text = template.replace();`,
    `const text = template.replace(token, value);`,
    'const text = template.replace(`{used}`, value);',
    `const text = fillTemplate(template, { used });`,
  ],
});
