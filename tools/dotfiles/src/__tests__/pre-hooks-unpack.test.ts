import { parseForESLint } from '@typescript-eslint/parser';
import { RuleTester } from '@typescript-eslint/rule-tester';
import type { TSESTree } from '@typescript-eslint/utils';
import { afterAll, describe, expect, it } from 'vitest';
import {
  findPropsUnpacksAfterHooks,
  preHooksUnpack,
  type RenderFunction,
} from '../rules/pre-hooks-unpack.ts';

// ---------------------------------------------------------------------------
// Direct unit tests of the shared helper (no ESLint wiring) — parse a fixture,
// pull out its render function + comments, and assert what the walk finds.
// ---------------------------------------------------------------------------

/** Pull the first module-scope render function out of a parsed fixture. */
const getRenderFn = (program: TSESTree.Program): RenderFunction => {
  for (const statement of program.body) {
    if (
      statement.type === 'ExportDefaultDeclaration' &&
      statement.declaration.type === 'FunctionDeclaration'
    ) {
      return statement.declaration;
    }
    const declaration =
      statement.type === 'ExportNamedDeclaration'
        ? statement.declaration
        : statement;
    if (declaration?.type === 'VariableDeclaration') {
      const init = declaration.declarations[0]?.init;
      if (
        init?.type === 'ArrowFunctionExpression' ||
        init?.type === 'FunctionExpression'
      ) {
        return init;
      }
    }
    if (statement.type === 'FunctionDeclaration') return statement;
  }
  throw new Error('no render function found in fixture');
};

const findings = (code: string): TSESTree.VariableDeclarator[] => {
  const { ast } = parseForESLint(code, {
    comment: true,
    ecmaFeatures: { jsx: true },
    loc: true,
    range: true,
  });
  return findPropsUnpacksAfterHooks(getRenderFn(ast), ast.comments ?? []);
};

describe('findPropsUnpacksAfterHooks', () => {
  it('flags an identity props unpack and its nested chain after // Hooks', () => {
    const found = findings(`export const Foo = (props) => {
  // Hooks

  // 🔌 Short Circuit
  const { item } = props;
  const { id } = item;

  return null;
};
`);

    // Both the props-level unpack and the nested unpack from the props-derived
    // \`item\` fire.
    expect(found).toHaveLength(2);
  });

  it('does not flag an identity unpack that sits before // Hooks', () => {
    const found = findings(`export const Foo = (props) => {
  const { item } = props;
  const { id } = item;

  // Hooks

  // Setup

  return null;
};
`);

    expect(found).toHaveLength(0);
  });

  it('does not flag derived consts in Setup (member access, narrowing)', () => {
    const found = findings(`export const Foo = (props) => {
  const { item } = props;

  // Hooks

  // Setup
  const label = item.name;
  const flag = 'x' in item ? item.x : null;

  return null;
};
`);

    expect(found).toHaveLength(0);
  });

  it('returns nothing when the function body has no // Hooks marker', () => {
    const found = findings(`export const loaderish = (props) => {
  const { a } = props;
  const { b } = a;
  return null;
};
`);

    expect(found).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// RuleTester — the single rule covers BOTH surfaces (authored component and
// route default Component). Fixtures for each surface.
// ---------------------------------------------------------------------------

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('pre-hooks-unpack', preHooksUnpack, {
  invalid: [
    // Component surface — props + nested unpack dumped after Short Circuit.
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
  const { item } = props;
  const { id, name } = item;

  return (
    <div>
      {name} (#{id})
    </div>
  );
};
`,
      errors: [
        { messageId: 'unpackAfterHooks' },
        { messageId: 'unpackAfterHooks' },
      ],
      filename: 'Foo.tsx',
    },
    // Route surface — the default Component unpacking after Short Circuit.
    {
      code: `import * as React from 'react';

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  const { loaderData } = props;
  const { repository } = loaderData;

  return <div>{repository.name}</div>;
}
`,
      errors: [
        { messageId: 'unpackAfterHooks' },
        { messageId: 'unpackAfterHooks' },
      ],
      filename: 'settings.repositories.$repositoryId._index.tsx',
    },
  ],
  valid: [
    // Component surface — identity + nested unpack before Hooks; derive in Setup.
    {
      code: `import * as React from 'react';

export interface FooProps {}

export const Foo = (props: FooProps): React.ReactElement => {
  const { item } = props;
  const { id, name } = item;

  // Hooks

  // Setup
  const label = \`\${name} (#\${id})\`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <div>{label}</div>;
};
`,
      filename: 'Foo.tsx',
    },
    // Route surface — the repositories-list shape: props + loaderData unpack
    // before Hooks, discriminated actionData narrowing stays a derived Setup const.
    {
      code: `import * as React from 'react';

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData } = props;
  const { repositories } = loaderData;

  // Hooks

  // Setup
  const actionError =
    actionData && 'error' in actionData ? actionData.error : null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      {repositories.length}
      {actionError}
    </div>
  );
}
`,
      filename: 'settings.repositories._index.tsx',
    },
    // Opt-out pragma on line 1 disables the check on both surfaces.
    {
      code: `/* component-shape: opt-out — legacy */
import * as React from 'react';

export const Foo = (props: FooProps): React.ReactElement => {
  // Hooks

  // 🔌 Short Circuit
  const { item } = props;

  return <div>{item}</div>;
};
`,
      filename: 'Legacy.tsx',
    },
  ],
});
