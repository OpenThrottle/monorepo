import { describe, expect, beforeEach, test, vi } from 'vitest';
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { storyGenerator } from './generator.story';
// The generator resolves `destination` through the real Nx project graph, whose
// first (cold) computation dominated this file's runtime — ~900ms of workspace
// scanning per test process, paid once per file across the cluster. Nothing here
// asserts graph construction; it asserts the emitted file set. `generator.test.ts`
// keeps the un-mocked path as the integration case.
vi.mock('@nx/devkit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nx/devkit')>();

  return {
    ...actual,
    createProjectGraphAsync: async () => ({
      dependencies: {},
      nodes: {
        '@openthrottle/react-router-shadcn': {
          data: { root: 'packages/react-router-shadcn' },
          name: '@openthrottle/react-router-shadcn',
          type: 'lib',
        },
      },
    }),
  };
});

const target = '@openthrottle/react-router-shadcn';
const componentsRoot = 'packages/react-router-shadcn/src/components';

/** A two-group `cva` component — the Button-shaped reference case. */
const CVA_COMPONENT = `
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

export const badgeVariants = cva('inline-flex', {
  defaultVariants: { size: 'default', variant: 'default' },
  variants: {
    size: {
      default: \`h-9 px-4\`,
      'icon-sm': \`size-8\`,
    },
    variant: {
      default: \`bg-primary\`,
      destructive: \`bg-destructive\`,
    },
  },
});

export interface TestBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const TestBadge = (props: TestBadgeProps): React.ReactElement => <span {...props} />;
`;

const PLAIN_COMPONENT = `
import * as React from 'react';

export interface TestPlainProps {
  readonly label?: string;
}

export const TestPlain = (props: TestPlainProps): React.ReactElement => <div />;
`;

describe('storyGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  test('should run successfully and emit a story beside the component', async () => {
    tree.write(`${componentsRoot}/TestBadge.tsx`, CVA_COMPONENT);

    await storyGenerator(tree, { destination: target, name: 'TestBadge' });

    const storyPath = `${componentsRoot}/TestBadge.stories.tsx`;
    expect(tree.exists(storyPath)).toBe(true);

    const source = tree.read(storyPath, 'utf-8');

    expect(source).toBeDefined();
    expect(source).toContain(
      "import type { Meta, StoryObj } from '@storybook/react-vite'",
    );
    expect(source).toContain(
      "import { TestBadge, type TestBadgeProps } from './TestBadge'",
    );
    expect(source).toContain('satisfies Meta<typeof TestBadge>');
    expect(source).toContain("title: 'Components/TestBadge'");
    expect(source).toContain('export const Default: Story = {}');
  });

  test('derives argTypes and typed option lists from the cva variant map', async () => {
    tree.write(`${componentsRoot}/TestBadge.tsx`, CVA_COMPONENT);

    await storyGenerator(tree, { destination: target, name: 'TestBadge' });

    const source = tree.read(
      `${componentsRoot}/TestBadge.stories.tsx`,
      'utf-8',
    );

    // Options are typed against the component's own props, so an invalid
    // value fails typecheck rather than silently rendering nothing.
    expect(source).toContain(
      "const SIZES: readonly NonNullable<TestBadgeProps['size']>[]",
    );
    expect(source).toContain(
      "const VARIANTS: readonly NonNullable<TestBadgeProps['variant']>[]",
    );
    expect(source).toContain("'icon-sm'");
    expect(source).toContain("'destructive'");
    expect(source).toContain("size: { control: 'select', options: SIZES }");
    expect(source).toContain(
      "variant: { control: 'select', options: VARIANTS }",
    );
    // Two groups -> a nested variant matrix.
    expect(source).toContain('export const VariantMatrix: Story');
  });

  /**
   * The repo lints `sort-keys` and `react/jsx-sort-props` at error, so
   * generated output that needs hand-fixing before it lints is a broken
   * scaffold. Both orderings regressed once and are pinned here.
   */
  test('emits output that satisfies the repo ordering lint rules', async () => {
    tree.write(`${componentsRoot}/TestBadge.tsx`, CVA_COMPONENT);

    await storyGenerator(tree, { destination: target, name: 'TestBadge' });

    const source = tree.read(
      `${componentsRoot}/TestBadge.stories.tsx`,
      'utf-8',
    );

    // sort-keys: 'argTypes' sorts before 'args'.
    expect(source?.indexOf('argTypes:')).toBeLessThan(
      source?.indexOf('args:') ?? -1,
    );
    // jsx-sort-props: key/size/variant alphabetised on the matrix element.
    expect(source).toContain('key={variant} size={size} variant={variant}');
  });

  test('omits the matrix and argTypes for a component with no cva map', async () => {
    tree.write(`${componentsRoot}/TestPlain.tsx`, PLAIN_COMPONENT);

    await storyGenerator(tree, { destination: target, name: 'TestPlain' });

    const source = tree.read(
      `${componentsRoot}/TestPlain.stories.tsx`,
      'utf-8',
    );

    expect(source).toContain('export const Default: Story = {}');
    expect(source).not.toContain('VariantMatrix');
    expect(source).not.toContain('argTypes');
    // No props import when there are no option lists to type.
    expect(source).toContain("import { TestPlain } from './TestPlain'");
  });

  test('places the story inside the folder for an index-folder component', async () => {
    tree.write(`${componentsRoot}/TestFolder/index.tsx`, PLAIN_COMPONENT);

    await storyGenerator(tree, { destination: target, name: 'TestFolder' });

    expect(
      tree.exists(`${componentsRoot}/TestFolder/TestFolder.stories.tsx`),
    ).toBe(true);
  });

  /**
   * Compound families (Card, Dialog, Select, …) keep the real component at
   * `<Name>/<Name>.tsx` beside a barrel of pure re-exports. Reading the barrel
   * finds no `cva` call, so preferring it would silently drop the variant
   * matrix for exactly the components that need it most.
   */
  test('reads the family component, not the re-export barrel', async () => {
    tree.write(`${componentsRoot}/TestBadge/TestBadge.tsx`, CVA_COMPONENT);
    tree.write(
      `${componentsRoot}/TestBadge/index.tsx`,
      `export * from './TestBadge';`,
    );

    await storyGenerator(tree, { destination: target, name: 'TestBadge' });

    const source = tree.read(
      `${componentsRoot}/TestBadge/TestBadge.stories.tsx`,
      'utf-8',
    );

    expect(source).toContain('export const VariantMatrix: Story');
    expect(source).toContain('options: SIZES');
  });

  test('falls back to an index.ts barrel when there is no other source', async () => {
    tree.write(`${componentsRoot}/TestBarrel/index.ts`, PLAIN_COMPONENT);

    await storyGenerator(tree, { destination: target, name: 'TestBarrel' });

    expect(
      tree.exists(`${componentsRoot}/TestBarrel/TestBarrel.stories.tsx`),
    ).toBe(true);
  });

  test('supports comma-separated names for batch scaffolding', async () => {
    tree.write(`${componentsRoot}/TestBadge.tsx`, CVA_COMPONENT);
    tree.write(`${componentsRoot}/TestPlain.tsx`, PLAIN_COMPONENT);

    await storyGenerator(tree, {
      destination: target,
      name: 'TestBadge,TestPlain',
    });

    expect(tree.exists(`${componentsRoot}/TestBadge.stories.tsx`)).toBe(true);
    expect(tree.exists(`${componentsRoot}/TestPlain.stories.tsx`)).toBe(true);
  });
});
