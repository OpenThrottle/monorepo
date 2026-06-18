import { describe, expect, it } from 'vitest';

import { FloorElementType, floorLayoutSchema } from '../../types';
import { createFloorElement } from '../elements';
import {
  addElement,
  createEmptyLayout,
  moveElement,
  removeElement,
  updateElement,
} from '../layout-operations';

const base = createEmptyLayout({ id: 'layout-1' });
const table = createFloorElement({
  center: { x: 24, y: 24 },
  id: 't1',
  type: FloorElementType.TABLE_SQUARE,
});
const wall = createFloorElement({
  center: { x: 10, y: 10 },
  id: 'w1',
  type: FloorElementType.WALL,
});

describe('createEmptyLayout', () => {
  it('builds a schema-valid empty layout', () => {
    expect(floorLayoutSchema.safeParse(base).success).toBe(true);
    expect(base.elements).toEqual([]);
    expect(base.schemaVersion).toBe(1);
  });
});

describe('addElement / removeElement', () => {
  it('appends immutably', () => {
    const next = addElement(base, table);
    expect(next.elements).toHaveLength(1);
    expect(base.elements).toHaveLength(0);
  });

  it('removes by id', () => {
    const next = removeElement(addElement(base, table), 't1');
    expect(next.elements).toHaveLength(0);
  });
});

describe('moveElement', () => {
  it('repositions the element center', () => {
    const next = moveElement(addElement(base, table), 't1', { x: 100, y: 200 });
    expect(next.elements[0]).toMatchObject({ x: 100, y: 200 });
  });
});

describe('updateElement', () => {
  it('patches seats on a table while preserving type', () => {
    const next = updateElement(addElement(base, table), 't1', { seats: 6 });
    const updated = next.elements[0];
    expect(updated.type).toBe(FloorElementType.TABLE_SQUARE);
    expect('seats' in updated && updated.seats).toBe(6);
    expect(floorLayoutSchema.safeParse(next).success).toBe(true);
  });

  it('ignores seats on a non-table and patches rotation', () => {
    const next = updateElement(addElement(base, wall), 'w1', {
      rotation: 45,
      seats: 4,
    });
    const updated = next.elements[0];
    expect(updated.type).toBe(FloorElementType.WALL);
    expect(updated.rotation).toBe(45);
    expect('seats' in updated).toBe(false);
  });
});
