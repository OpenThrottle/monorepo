import { findNearestSlot, slotOf } from './find-nearest-slot.ts';

describe('slotOf', () => {
  it('places at the stage root or inside a package', () => {
    expect(slotOf('', 'a')).toBe('node_modules/a');
    expect(slotOf('node_modules/x', 'a')).toBe('node_modules/x/node_modules/a');
  });
});

describe('findNearestSlot', () => {
  const placed = new Set([
    'node_modules/a',
    'node_modules/x/node_modules/a',
    'node_modules/x',
  ]);
  const has = (slot: string): boolean => {
    return placed.has(slot);
  };

  it('prefers the nested copy inside the requiring package', () => {
    expect(findNearestSlot(has, 'node_modules/x', 'a')).toBe(
      'node_modules/x/node_modules/a',
    );
  });

  it('walks up to the stage root', () => {
    expect(findNearestSlot(has, 'node_modules/x/node_modules/a', 'x')).toBe(
      'node_modules/x',
    );
  });

  it('finds the hoisted copy from a sibling', () => {
    expect(findNearestSlot(has, 'node_modules/y', 'a')).toBe('node_modules/a');
  });

  it('is undefined when nothing is placed', () => {
    expect(findNearestSlot(has, 'node_modules/y', 'nope')).toBeUndefined();
  });
});
