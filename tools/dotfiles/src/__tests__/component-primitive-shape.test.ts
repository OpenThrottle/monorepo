import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import { componentPrimitiveShape } from '../rules/component-primitive-shape.ts';

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

// A fully-conformant component (matches the generator template shape).
const CONFORMANT = `import * as React from 'react';

export interface FooProps {}

export const Foo = (props: FooProps): React.ReactElement => {
  const {} = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div data-testid="Foo">Foo</div>;
};
`;

ruleTester.run('component-primitive-shape', componentPrimitiveShape, {
  invalid: [
    // Missing the FooProps interface — fixable (scaffolds an empty one).
    {
      code: `import * as React from 'react';

export const Foo = (props: FooProps): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div>Foo</div>;
};
`,
      errors: [{ messageId: 'missingPropsInterface' }],
      filename: 'Foo.tsx',
      output: `import * as React from 'react';

export interface FooProps {}

export const Foo = (props: FooProps): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div>Foo</div>;
};
`,
    },
    // No markers at all — six missingMarker reports, autofix scaffolds the block.
    {
      code: `import * as React from 'react';

export interface FooProps {}

export const Foo = (props: FooProps): React.ReactElement => {
  return <div>Foo</div>;
};
`,
      errors: [
        { messageId: 'missingMarker' },
        { messageId: 'missingMarker' },
        { messageId: 'missingMarker' },
        { messageId: 'missingMarker' },
        { messageId: 'missingMarker' },
        { messageId: 'missingMarker' },
      ],
      filename: 'Foo.tsx',
      output: `import * as React from 'react';

export interface FooProps {}

export const Foo = (props: FooProps): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div>Foo</div>;
};
`,
    },
    // Markers present but out of order (Setup before Hooks).
    {
      code: `import * as React from 'react';

export interface FooProps {}

export const Foo = (props: FooProps): React.ReactElement => {
  // Setup

  // Hooks

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div>Foo</div>;
};
`,
      errors: [{ messageId: 'markerOutOfOrder' }],
      filename: 'Foo.tsx',
    },
    // Missing the explicit React.ReactElement return type.
    {
      code: `import * as React from 'react';

export interface FooProps {}

export const Foo = (props: FooProps) => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div>Foo</div>;
};
`,
      errors: [{ messageId: 'missingReturnType' }],
      filename: 'Foo.tsx',
    },
    // A marker glued to the brace with no blank line above it.
    {
      code: `import * as React from 'react';

export interface FooProps {}

export const Foo = (props: FooProps): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  // 🔌 Short Circuit

  return <div>Foo</div>;
};
`,
      errors: [{ messageId: 'markerMissingBlankLine' }],
      filename: 'Foo.tsx',
    },
  ],
  valid: [
    { code: CONFORMANT, filename: 'Foo.tsx' },
    // Opt-out pragma on line 1 disables every check.
    {
      code: `/* component-shape: opt-out — third-party wrapper */
export const whatever = 1;
`,
      filename: 'Legacy.tsx',
    },
  ],
});
