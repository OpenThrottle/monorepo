import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, test } from 'vitest';

/**
 * Guards the React/React-Router *template* test output against the conventions
 * the audit flagged as drift-prone. The per-sub-generator `.test.ts` files only
 * assert that a generator runs; nothing previously asserted the *emitted* test
 * files match repo testing rules (`.cursor/rules`):
 *
 *   - use `component` (the RenderResult), never the global `screen`
 *   - use `userEvent`, never `fireEvent`
 *   - app `tests/setup.ts` is a single `setupReactRouterTest(...)` call
 *
 * Because `vitest.config.ts` excludes `**\/files/**`, these template files are
 * never executed; this suite reads them off disk and lint-checks the source.
 */

const generatorsRoot = __dirname;

// Every emitted React/React-Router test template — the `fireEvent`/`screen`
// guards apply to all of them.
const emittedTestTemplates = [
  'react-router/files/component/__tests__/__name__.test.tsx',
  'react-router/files/form/components/__tests__/__name__.test.tsx',
  'react-router/files/modal/__tests__/__name__.test.tsx',
  'react-router/files/route/__tests__/__name__.test.tsx',
  'react-router/files/route-api/__tests__/__name__.test.tsx',
  'react-router/files/table/__tests__/__name__.test.tsx',
  'react/files/component/__tests__/__name__.test.tsx',
  'react/files/hook/__tests__/__name__.test.tsx',
  'react/files/util/__tests__/__name__.test.tsx',
];

// The subset that renders a component and queries the DOM (route-api tests
// loaders/actions only; hook uses renderHook; util tests a pure function).
const componentRenderingTemplates = [
  'react-router/files/component/__tests__/__name__.test.tsx',
  'react-router/files/form/components/__tests__/__name__.test.tsx',
  'react-router/files/modal/__tests__/__name__.test.tsx',
  'react-router/files/route/__tests__/__name__.test.tsx',
  'react-router/files/table/__tests__/__name__.test.tsx',
];

const read = (relative: string): string =>
  readFileSync(join(generatorsRoot, relative), 'utf8');

describe('emitted test templates follow testing conventions', () => {
  test.each(emittedTestTemplates)('does not use fireEvent: %s', (relative) => {
    expect(read(relative)).not.toContain('fireEvent');
  });

  test.each(emittedTestTemplates)(
    'does not import or reference the global screen: %s',
    (relative) => {
      const source = read(relative);

      expect(source).not.toMatch(/\bimport\b[^;]*\bscreen\b/);
      expect(source).not.toMatch(/\bscreen\./);
    },
  );

  test.each(componentRenderingTemplates)(
    'queries through the rendered component, not a global: %s',
    (relative) => {
      const source = read(relative);

      // Renders via @testing-library/react and queries off the returned
      // RenderResult (`component`/`view`), never the global `screen`.
      expect(source).toContain("from '@testing-library/react'");
      expect(source).toMatch(/\b(component|view)\.(get|query|find)By/);
    },
  );
});

describe('form template uses Title-Case labels and userEvent', () => {
  const formTest =
    'react-router/files/form/components/__tests__/__name__.test.tsx';

  test('interacts via userEvent rather than fireEvent', () => {
    const source = read(formTest);

    expect(source).toContain(
      "import userEvent from '@testing-library/user-event'",
    );
    expect(source).toContain('userEvent.click');
  });

  test('label and button copy are Title-Cased, not lowercased', () => {
    const source = read(formTest);

    expect(source).toContain("getByLabelText('Search')");
    expect(source).toContain("getByRole('button', { name: 'Submit' })");
    // Guard against the lowercased drift the audit called out.
    expect(source).not.toContain("getByLabelText('search')");
    expect(source).not.toContain("name: 'submit'");
  });
});

describe('app test setup template', () => {
  const reactRouterSetup = 'react-router/files/application/tests/setup.ts';

  test('is a single setupReactRouterTest call with an APP_NAME env', () => {
    const source = read(reactRouterSetup);

    expect(source).toContain(
      "import { setupReactRouterTest } from '@openthrottle/react-router-testing'",
    );
    expect(source).toContain('setupReactRouterTest({ env: { APP_NAME:');
    // The shared setup bakes in afterEach(cleanup) + jsdom polyfills; templates
    // must not re-add those per-app shims.
    expect(source).not.toContain('afterEach(cleanup)');
    expect(source).not.toContain('global.ResizeObserver');
  });
});
