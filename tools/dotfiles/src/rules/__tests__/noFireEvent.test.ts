import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noFireEvent } from '../noFireEvent.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('no-fire-event', noFireEvent, {
  invalid: [
    {
      code: "import { fireEvent, render } from '@testing-library/react';",
      errors: [{ messageId: 'fireEvent' }],
    },
    {
      code: "import { fireEvent as fire } from '@testing-library/dom';",
      errors: [{ messageId: 'fireEvent' }],
    },
  ],
  valid: [
    "import { render, waitFor } from '@testing-library/react';",
    "import userEvent from '@testing-library/user-event';",
    // Only Testing Library's fireEvent is in scope.
    "import { fireEvent } from './local-events';",
  ],
});
