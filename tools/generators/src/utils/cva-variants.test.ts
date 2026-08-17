import { describe, expect, test } from 'vitest';
import { acceptsChildren, extractCvaVariants } from './cva-variants';

/**
 * The fixture is trimmed from the real `Button.tsx` — deliberately keeping the
 * hostile parts: backtick values, a `defaultVariants` block that must not be
 * mistaken for `variants`, quoted keys that need quoting (`icon-lg`), and
 * Tailwind arbitrary variants carrying braces and brackets inside strings.
 */
const BUTTON_SOURCE = `
export const buttonVariants = cva(
  "inline-flex items-center [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: \`h-9 px-4 py-2 has-[>svg]:px-3\`,
        'icon-lg': \`size-10\`,
        lg: \`h-10 rounded-md px-6 has-[>svg]:px-4\`,
      },
      variant: {
        default: \`bg-primary text-primary-foreground hover:bg-primary/90\`,
        destructive: \`bg-destructive text-white dark:bg-destructive/60\`,
      },
    },
  },
);
`;

describe('extractCvaVariants', () => {
  test('extracts each variant group and its options', () => {
    expect(extractCvaVariants(BUTTON_SOURCE)).toStrictEqual([
      { options: ['default', 'icon-lg', 'lg'], propName: 'size' },
      { options: ['default', 'destructive'], propName: 'variant' },
    ]);
  });

  test('does not mistake defaultVariants for the variants map', () => {
    const groups = extractCvaVariants(BUTTON_SOURCE);

    // `defaultVariants` declares size/variant as plain strings, so treating it
    // as the variants map would yield groups with zero options.
    expect(groups.every((group) => group.options.length > 1)).toBe(true);
  });

  test('returns an empty list for a component with no cva call', () => {
    const source = `export const Card = () => <div className="p-4" />;`;

    expect(extractCvaVariants(source)).toStrictEqual([]);
  });

  test('returns an empty list for a cva call with no variants map', () => {
    const source = `export const plain = cva('rounded-md border');`;

    expect(extractCvaVariants(source)).toStrictEqual([]);
  });

  /**
   * Regression: the real `Badge.tsx` keeps a commented-out copy of its entire
   * `variant` map directly beneath the live one, which produced every option
   * twice before comments were stripped.
   */
  test('ignores commented-out variant keys', () => {
    const source = `
      const badgeVariants = cva('inline-flex', {
        variants: {
          variant: {
            default: \`\`,
            secondary: \`\`,
            // default: \`bg-primary text-primary-foreground\`,
            // secondary: \`bg-secondary text-secondary-foreground\`,
          },
          /* size: { blocked: '' }, */
        },
      });
    `;

    expect(extractCvaVariants(source)).toStrictEqual([
      { options: ['default', 'secondary'], propName: 'variant' },
    ]);
  });

  test('does not treat a // inside a class string as a comment', () => {
    const source = `
      const x = cva('base', {
        variants: {
          tone: {
            muted: 'bg-[url(https://example.com/a.png)]',
            loud: 'font-bold',
          },
        },
      });
    `;

    expect(extractCvaVariants(source)).toStrictEqual([
      { options: ['muted', 'loud'], propName: 'tone' },
    ]);
  });

  test('tolerates braces inside class strings', () => {
    const source = `
      const x = cva('base', {
        variants: {
          tone: {
            muted: '[&_svg]:size-4 data-[state=open]:bg-muted',
            loud: "before:content-['{'] after:content-['}']",
          },
        },
      });
    `;

    expect(extractCvaVariants(source)).toStrictEqual([
      { options: ['muted', 'loud'], propName: 'tone' },
    ]);
  });
});

describe('acceptsChildren', () => {
  test.each([
    [
      'ComponentPropsWithoutRef',
      `type P = React.ComponentPropsWithoutRef<'span'>;`,
    ],
    [
      'HTMLAttributes',
      `type P = React.ButtonHTMLAttributes<HTMLButtonElement>;`,
    ],
    ['an explicit children prop', `interface P { children: React.ReactNode }`],
  ])('detects %s', (_label, source) => {
    expect(acceptsChildren(source)).toBe(true);
  });

  /**
   * Regression: `Input` declares `React.ComponentProps<'input'>`, which matches
   * the generic prop-type heuristic — but `<input>` is a void element, so
   * emitting children is a React RUNTIME error, not just a type error.
   */
  test.each([
    ['input', `interface InputProps extends React.ComponentProps<'input'> {}`],
    ['img', `interface ImgProps extends React.ComponentProps<'img'> {}`],
    [
      'hr via WithoutRef',
      `interface HrProps extends React.ComponentPropsWithoutRef<'hr'> {}`,
    ],
  ])('returns false for the void element %s', (_label, source) => {
    expect(acceptsChildren(source)).toBe(false);
  });

  test('still returns true for a non-void intrinsic element', () => {
    expect(
      acceptsChildren(`interface P extends React.ComponentProps<'span'> {}`),
    ).toBe(true);
  });

  test('returns false for a closed prop interface', () => {
    expect(acceptsChildren(`interface P { readonly label?: string }`)).toBe(
      false,
    );
  });

  test('ignores a children mention that only appears in a comment', () => {
    expect(
      acceptsChildren(`// takes no children\ninterface P { label: string }`),
    ).toBe(false);
  });
});
