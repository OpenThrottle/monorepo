import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { disableRequiresReason } from '../disableRequiresReason.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

// The directives under test suppress nothing, so ESLint's own unused-directive
// report would otherwise land in every case.
const ruleTester = new RuleTester({
  linterOptions: { reportUnusedDisableDirectives: 'off' },
});

ruleTester.run('disable-requires-reason', disableRequiresReason, {
  invalid: [
    {
      code: '// eslint-disable-next-line no-console\nconsole.log(1);',
      errors: [
        {
          data: { directive: 'eslint-disable-next-line' },
          messageId: 'missingReason',
        },
      ],
    },
    {
      code: 'console.log(1); // eslint-disable-line no-console',
      errors: [
        {
          data: { directive: 'eslint-disable-line' },
          messageId: 'missingReason',
        },
      ],
    },
    {
      code: '/* eslint-disable no-console */\nconst a = 1;',
      errors: [
        { data: { directive: 'eslint-disable' }, messageId: 'missingReason' },
      ],
    },
    {
      // A separator with nothing after it is still no reason.
      code: '/* eslint-disable no-console -- */\nconst a = 1;',
      errors: [{ messageId: 'missingReason' }],
    },
  ],
  valid: [
    '// eslint-disable-next-line no-console -- CLI output is the product\nconsole.log(1);',
    'console.log(1); // eslint-disable-line no-console -- CLI output',
    '/* eslint-disable no-console -- generated file */\nconst a = 1;',
    '/* eslint-disable -- vendored code */\nconst a = 1;',
    // Known blind spot: a blanket disable with no rule list suppresses every
    // report after it, this rule's own included. Only generated files (which
    // the shared config ignores) use one today.
    '/* eslint-disable */\nconst a = 1;',
    // Re-enabling is not a suppression.
    '/* eslint-enable */\nconst a = 1;',
    // Prose that mentions a directive is not one.
    '// Do not add eslint-disable here.\nconst a = 1;',
    '/** Prefer a reason over eslint-disable-next-line. */\nconst a = 1;',
  ],
});
