import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noScreen } from '../noScreen.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('no-screen', noScreen, {
  invalid: [
    {
      code: "import { render, screen } from '@testing-library/react';",
      errors: [{ messageId: 'screen' }],
    },
    {
      code: "import { screen as s } from '@testing-library/dom';",
      errors: [{ messageId: 'screen' }],
    },
  ],
  valid: [
    "import { render, waitFor, within } from '@testing-library/react';",
    "import userEvent from '@testing-library/user-event';",
    // Only Testing Library's screen is in scope.
    "import { screen } from './local-screen';",
    "import { screen } from 'electron';",
  ],
});
