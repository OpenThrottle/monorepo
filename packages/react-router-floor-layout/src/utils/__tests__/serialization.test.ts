import { describe, expect, it } from 'vitest';

import { FloorElementType } from '../../types';
import { createFloorElement } from '../elements';
import { addElement, createEmptyLayout } from '../layout-operations';
import { fromJSON, toJSON } from '../serialization';

const layout = addElement(
  createEmptyLayout({ id: 'layout-1', name: 'Main floor' }),
  createFloorElement({
    center: { x: 24, y: 24 },
    id: 't1',
    type: FloorElementType.TABLE_ROUND,
  }),
);

describe('toJSON / fromJSON', () => {
  it('round-trips losslessly', () => {
    expect(fromJSON(toJSON(layout))).toEqual(layout);
  });

  it('accepts an already-parsed object', () => {
    expect(fromJSON(layout)).toEqual(layout);
  });

  it('throws on an unsupported schemaVersion', () => {
    expect(() => fromJSON({ ...layout, schemaVersion: 2 })).toThrow();
  });

  it('throws on structurally invalid data', () => {
    expect(() => fromJSON('{"not":"a layout"}')).toThrow();
  });
});
