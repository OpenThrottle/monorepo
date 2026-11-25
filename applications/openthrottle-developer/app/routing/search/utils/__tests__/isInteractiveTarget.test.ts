import { describe, expect, test } from 'vitest';

import { isInteractiveTarget } from '../isInteractiveTarget';

describe('isInteractiveTarget', () => {
  test('is false for a non-element target', () => {
    expect(isInteractiveTarget(null)).toBe(false);
  });

  test('is true inside a link or button', () => {
    const link = document.createElement('a');
    const icon = document.createElement('span');

    link.append(icon);

    expect(isInteractiveTarget(icon)).toBe(true);
    expect(isInteractiveTarget(document.createElement('button'))).toBe(true);
  });

  test('is true for a menu item', () => {
    const item = document.createElement('div');

    item.setAttribute('role', 'menuitem');

    expect(isInteractiveTarget(item)).toBe(true);
  });

  test('is false for plain text', () => {
    expect(isInteractiveTarget(document.createElement('div'))).toBe(false);
  });
});
