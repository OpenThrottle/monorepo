import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import { routePrimitiveShape } from '../rules/route-primitive-shape.ts';

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

// A conformant route: only the framework surface + a type alias, default
// Component with all six markers in order.
const CONFORMANT = `import * as React from 'react';

type HandleData = { title: string };

export const handle: HandleData = { title: 'Foo' };

export const loader = async () => {
  const rangeDays = 30;
  return { rangeDays };
};

export const meta = () => {
  return [{ title: 'Foo' }];
};

export default function Component(): React.ReactElement {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div data-testid="Foo">Foo</div>;
}

export const action = async () => {
  return {};
};

export const ErrorBoundary = () => <div>error</div>;
`;

// A resource route: only loader/action, no default Component (nothing for R2).
const RESOURCE_ROUTE = `export const loader = async () => {
  return new Response('ok');
};

export const action = async () => {
  return new Response('ok');
};
`;

// A route exporting the RR middleware surface — an allowed export (R1).
const MIDDLEWARE_ROUTE = `export const middleware = [async () => {}];

export const clientMiddleware = [async () => {}];

export const loader = async () => {
  return {};
};
`;

ruleTester.run('route-primitive-shape', routePrimitiveShape, {
  invalid: [
    // The skills.$slug case: a module-scope config const AND a module-scope
    // mapper helper — two R3 moduleScopeDeclaration reports.
    {
      code: `import * as React from 'react';

const SKILL_USAGE_RANGE_DAYS = 30;

const toSkillDetailUsageData = (raw: { count: number }) => {
  return { count: raw.count, rangeDays: SKILL_USAGE_RANGE_DAYS };
};

export const loader = async () => {
  return {};
};

export default function Component(): React.ReactElement {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div>Foo</div>;
}
`,
      errors: [
        { messageId: 'moduleScopeDeclaration' },
        { messageId: 'moduleScopeDeclaration' },
      ],
      filename: 'skills.$slug.tsx',
    },
    // A disallowed named value export (a config constant) — R1.
    {
      code: `export const MAX_FILE_MENTION_RESULTS = 20;

export const loader = async () => {
  return {};
};
`,
      errors: [{ messageId: 'disallowedExport' }],
      filename: 'ide.files.tsx',
    },
    // A non-exported module-scope helper function — R3.
    {
      code: `export const loader = async () => {
  return {};
};

function filterNotesBySearch(notes: string[]): string[] {
  return notes;
}
`,
      errors: [{ messageId: 'moduleScopeDeclaration' }],
      filename: 'notes._index.tsx',
    },
    // Default Component missing every marker — six R2 reports (scaffold autofix).
    {
      code: `import * as React from 'react';

export default function Component(): React.ReactElement {
  return <div>Foo</div>;
}
`,
      errors: [
        { messageId: 'missingMarker' },
        { messageId: 'missingMarker' },
        { messageId: 'missingMarker' },
        { messageId: 'missingMarker' },
        { messageId: 'missingMarker' },
        { messageId: 'missingMarker' },
      ],
      filename: 'foo.tsx',
      output: `import * as React from 'react';

export default function Component(): React.ReactElement {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div>Foo</div>;
}
`,
    },
    // Markers present but out of order (Setup before Hooks) — R2.
    {
      code: `import * as React from 'react';

export default function Component(): React.ReactElement {
  // Setup

  // Hooks

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div>Foo</div>;
}
`,
      errors: [{ messageId: 'markerOutOfOrder' }],
      filename: 'foo.tsx',
    },
  ],
  valid: [
    { code: CONFORMANT, filename: 'foo.tsx' },
    { code: RESOURCE_ROUTE, filename: 'resources.thing.tsx' },
    { code: MIDDLEWARE_ROUTE, filename: 'pull-requests._index.tsx' },
    // A default export by identifier reference is the Component, not an R3
    // helper, and its markers are still checked.
    {
      code: `import * as React from 'react';

const RouteComponent = (): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div>Foo</div>;
};

export default RouteComponent;
`,
      filename: 'foo.tsx',
    },
    // Opt-out pragma on line 1 disables every check.
    {
      code: `/* route-shape: opt-out — legacy route pending remediation */
const helper = 1;
export const whatever = helper;
`,
      filename: 'legacy.tsx',
    },
  ],
});
