import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, expect, it } from 'vitest';
import { componentPrimitiveShape } from '../rules/component-primitive-shape.ts';

/**
 * Contract test: the `@tools/generators` component template MUST pass the
 * `component-primitive-shape` rule. This ties the two together — changing the
 * template without updating the rule (or vice versa) fails CI, so the generator
 * (the source of truth) and the enforcer can never drift.
 */

// tools/dotfiles/src/__tests__ -> tools/
const TOOLS_ROOT = join(__dirname, '..', '..', '..');

const readTemplate = (relativeToTools: string): string =>
  readFileSync(join(TOOLS_ROOT, relativeToTools), 'utf-8');

const REACT_TEMPLATE =
  'generators/src/generators/react/files/component/__name__.tsx';
const REACT_ROUTER_TEMPLATE =
  'generators/src/generators/react-router/files/component/__name__.tsx';

// The two component templates are byte-identical; assert that so the single
// RuleTester run below genuinely covers both.
describe('generator component templates', () => {
  it('react and react-router component templates stay byte-identical', () => {
    expect(readTemplate(REACT_TEMPLATE)).toBe(
      readTemplate(REACT_ROUTER_TEMPLATE),
    );
  });
});

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('generator-template-contract', componentPrimitiveShape, {
  invalid: [],
  valid: [
    {
      code: readTemplate(REACT_ROUTER_TEMPLATE).replace(
        /<%= name %>/g,
        'SampleWidget',
      ),
      filename: 'SampleWidget.tsx',
    },
  ],
});
