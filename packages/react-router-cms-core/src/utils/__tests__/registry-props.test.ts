import { describe, expect, test } from 'vitest';

import {
  toButtonProps,
  toHeadingProps,
  toLogicParamsProps,
} from '../registry-props';

describe('utils/registry-props', () => {
  test('narrows stored properties into typed props with safe fallbacks', () => {
    expect(
      toButtonProps({
        children: null,
        properties: { cta: 'Go', size: 'huge' },
      }),
    ).toStrictEqual({
      className: undefined,
      cta: 'Go',
      size: 'md',
      variant: 'primary',
    });
  });

  test('defaults an invalid heading level', () => {
    expect(
      toHeadingProps({
        children: null,
        properties: { copy: 'Hi', heading: 'h9' },
      }).heading,
    ).toBe('h2');
  });

  test('places the rendered children into container props', () => {
    expect(
      toLogicParamsProps({
        children: 'kids',
        properties: { param: 'p', value: 'v' },
      }),
    ).toStrictEqual({ children: 'kids', param: 'p', value: 'v' });
  });
});
