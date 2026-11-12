import { describe, expect, test } from 'vitest';

import { shouldReorderOnHover } from '../shouldReorderOnHover';

// A 100px-tall row starting at y=200, so its middle is y=250.
const hoverRect = { bottom: 300, top: 200 };

describe('shouldReorderOnHover', () => {
  describe('when dragging down', () => {
    test('waits until the pointer passes the middle', () => {
      expect(
        shouldReorderOnHover({
          clientY: 240,
          dragIndex: 0,
          hoverIndex: 1,
          hoverRect,
        }),
      ).toBe(false);
    });

    test('reorders once the pointer is below the middle', () => {
      expect(
        shouldReorderOnHover({
          clientY: 260,
          dragIndex: 0,
          hoverIndex: 1,
          hoverRect,
        }),
      ).toBe(true);
    });
  });

  describe('when dragging up', () => {
    test('waits until the pointer passes the middle', () => {
      expect(
        shouldReorderOnHover({
          clientY: 260,
          dragIndex: 2,
          hoverIndex: 1,
          hoverRect,
        }),
      ).toBe(false);
    });

    test('reorders once the pointer is above the middle', () => {
      expect(
        shouldReorderOnHover({
          clientY: 240,
          dragIndex: 2,
          hoverIndex: 1,
          hoverRect,
        }),
      ).toBe(true);
    });
  });

  describe('when hovering the dragged row itself', () => {
    test('never reorders', () => {
      expect(
        shouldReorderOnHover({
          clientY: 290,
          dragIndex: 1,
          hoverIndex: 1,
          hoverRect,
        }),
      ).toBe(false);
    });
  });

  describe('when there is no pointer offset yet', () => {
    test('never reorders', () => {
      expect(
        shouldReorderOnHover({
          clientY: undefined,
          dragIndex: 0,
          hoverIndex: 1,
          hoverRect,
        }),
      ).toBe(false);
    });
  });
});
