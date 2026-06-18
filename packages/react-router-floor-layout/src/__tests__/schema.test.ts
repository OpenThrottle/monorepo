import { describe, expect, it } from 'vitest';

import {
  FloorElementType,
  floorElementSchema,
  floorLayoutSchema,
} from '../types';

const validTable = {
  height: 24,
  id: 't1',
  layer: 2,
  rotation: 0,
  seats: 4,
  type: FloorElementType.TABLE_ROUND,
  width: 24,
  x: 0,
  y: 0,
};

const validLayout = {
  displayUnit: 'ft-in',
  elements: [validTable],
  gridSize: 12,
  height: 360,
  id: 'layout-1',
  name: 'Main',
  schemaVersion: 1,
  width: 480,
};

describe('floorElementSchema', () => {
  it('accepts a valid table', () => {
    expect(floorElementSchema.safeParse(validTable).success).toBe(true);
  });

  it('rejects a table missing seats', () => {
    const { seats: _seats, ...noSeats } = validTable;
    expect(floorElementSchema.safeParse(noSeats).success).toBe(false);
  });

  it('rejects a zone missing its required label', () => {
    const zone = {
      height: 120,
      id: 'z1',
      layer: 0,
      rotation: 0,
      type: FloorElementType.ZONE,
      width: 120,
      x: 0,
      y: 0,
    };
    expect(floorElementSchema.safeParse(zone).success).toBe(false);
  });

  it('rejects an unknown element type', () => {
    expect(
      floorElementSchema.safeParse({ ...validTable, type: 'sofa' }).success,
    ).toBe(false);
  });

  it('rejects a non-positive dimension', () => {
    expect(
      floorElementSchema.safeParse({ ...validTable, width: 0 }).success,
    ).toBe(false);
  });
});

describe('floorLayoutSchema', () => {
  it('accepts a valid layout', () => {
    expect(floorLayoutSchema.safeParse(validLayout).success).toBe(true);
  });

  it('rejects an unsupported schemaVersion', () => {
    expect(
      floorLayoutSchema.safeParse({ ...validLayout, schemaVersion: 2 }).success,
    ).toBe(false);
  });

  it('rejects an invalid display unit', () => {
    expect(
      floorLayoutSchema.safeParse({ ...validLayout, displayUnit: 'parsecs' })
        .success,
    ).toBe(false);
  });
});
