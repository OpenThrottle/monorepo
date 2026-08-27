import { describe, expect, test } from 'vitest';
import { toggleCheckoutSelection } from '../chat-checkout-selection';

describe('toggleCheckoutSelection', () => {
  test('appends so the first pick stays primary', () => {
    expect(toggleCheckoutSelection(['a'], 'b', 3)).toEqual(['a', 'b']);
    expect(toggleCheckoutSelection([], 'a', 3)).toEqual(['a']);
  });

  test('removes an already-selected id', () => {
    expect(toggleCheckoutSelection(['a', 'b', 'c'], 'b', 3)).toEqual([
      'a',
      'c',
    ]);
  });

  test('promotes the next entry when the primary is removed', () => {
    expect(toggleCheckoutSelection(['a', 'b'], 'a', 3)).toEqual(['b']);
  });

  test('refuses to add past the cap', () => {
    expect(toggleCheckoutSelection(['a', 'b'], 'c', 2)).toEqual(['a', 'b']);
  });

  test('still allows removal at the cap', () => {
    expect(toggleCheckoutSelection(['a', 'b'], 'b', 2)).toEqual(['a']);
  });

  test('does not mutate the input', () => {
    const input = ['a'];
    toggleCheckoutSelection(input, 'b', 3);
    expect(input).toEqual(['a']);
  });
});
