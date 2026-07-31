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

// A conformant single primitive part (forwardRef + Props + markers + displayName).
const part = (nameArg: string): string => `export interface ${nameArg}Props {}

export const ${nameArg} = React.forwardRef<HTMLDivElement, ${nameArg}Props>(
  (props, ref): React.ReactElement => {
    const { ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return <div ref={ref} {...rest} />;
  },
);

${nameArg}.displayName = '${nameArg}';`;

// A multi-export compound family — the shape the base standard can't map.
const CONFORMANT_FAMILY = `import * as React from 'react';

${part('Card')}

${part('CardHeader')}
`;

// A cva single-export primitive: the `cardVariants` cva object must NOT be
// treated as a component part (camelCase + string-first cva call).
const CONFORMANT_CVA = `import * as React from 'react';
import { cva } from 'class-variance-authority';

const cardVariants = cva('base');

${part('Card')}
`;

ruleTester.run(
  'component-primitive-shape (primitive profile)',
  componentPrimitiveShape,
  {
    invalid: [
      // forwardRef part with no displayName (VR2).
      {
        code: `import * as React from 'react';

export interface CardProps {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (props, ref): React.ReactElement => {
    const { ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return <div ref={ref} {...rest} />;
  },
);
`,
        errors: [{ messageId: 'missingDisplayName' }],
        filename: 'Card.tsx',
        options: [{ profile: 'primitive' }],
      },
      // A part missing its paired `<Part>Props` (VR1) — fixable.
      {
        code: `import * as React from 'react';

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (props, ref): React.ReactElement => {
    const { ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return <span ref={ref} {...rest} />;
  },
);

Badge.displayName = 'Badge';
`,
        errors: [{ messageId: 'missingPropsInterface' }],
        filename: 'Badge.tsx',
        options: [{ profile: 'primitive' }],
        output: `import * as React from 'react';

export interface BadgeProps {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (props, ref): React.ReactElement => {
    const { ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return <span ref={ref} {...rest} />;
  },
);

Badge.displayName = 'Badge';
`,
      },
      // The raw shadcn trailing `export { … }` re-export block is banned (VR5).
      {
        code: `import * as React from 'react';

export interface CardProps {}

const Card = (props: CardProps): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div>Card</div>;
};

export { Card };
`,
        errors: [{ messageId: 'namedReExportBlock' }],
        filename: 'Card.tsx',
        options: [{ profile: 'primitive' }],
      },
      // A part with no markers at all (R3) — one error per missing marker.
      {
        code: `import * as React from 'react';

export interface FooProps {}

export const Foo = React.forwardRef<HTMLDivElement, FooProps>(
  (props, ref): React.ReactElement => {
    return <div ref={ref} />;
  },
);

Foo.displayName = 'Foo';
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
        options: [{ profile: 'primitive' }],
      },
    ],
    valid: [
      // Multi-export compound family: every part conforms.
      {
        code: CONFORMANT_FAMILY,
        filename: 'Card.tsx',
        options: [{ profile: 'primitive' }],
      },
      // cva variant object is not mistaken for a component part.
      {
        code: CONFORMANT_CVA,
        filename: 'Card.tsx',
        options: [{ profile: 'primitive' }],
      },
      // VR1 accepts an exported `type <Part>Props` for union-props primitives.
      {
        code: `import * as React from 'react';

export type ToggleGroupProps = React.ComponentProps<'div'> & { size?: 'sm' };

export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  (props, ref): React.ReactElement => {
    const { className, size, ...rest } = props;

    // Hooks

    // Setup

    // Handlers

    // Markup

    // Life Cycle

    // 🔌 Short Circuit

    return <div className={className} data-size={size} ref={ref} {...rest} />;
  },
);

ToggleGroup.displayName = 'ToggleGroup';
`,
        filename: 'ToggleGroup.tsx',
        options: [{ profile: 'primitive' }],
      },
      // Opt-out pragma still disables every check under the primitive profile.
      {
        code: `/* component-shape: opt-out — vendored, re-sync pending */
export const whatever = 1;
`,
        filename: 'Vendored.tsx',
        options: [{ profile: 'primitive' }],
      },
    ],
  },
);
