import { describe, expect, it } from 'vitest';

import { DisplayUnit } from '../../types';
import { formatDimensions, formatInches } from '../units';

describe('formatInches', () => {
  it('formats feet + inches', () => {
    expect(formatInches(24, DisplayUnit.FT_IN)).toBe(`2' 0"`);
    expect(formatInches(30, DisplayUnit.FT_IN)).toBe(`2' 6"`);
    expect(formatInches(11, DisplayUnit.FT_IN)).toBe(`0' 11"`);
  });

  it('formats centimeters (rounded)', () => {
    expect(formatInches(24, DisplayUnit.CM)).toBe('61 cm');
  });

  it('formats meters (2 decimals)', () => {
    expect(formatInches(24, DisplayUnit.M)).toBe('0.61 m');
  });
});

describe('formatDimensions', () => {
  it('joins width × height in the display unit', () => {
    expect(formatDimensions(24, 24, DisplayUnit.FT_IN)).toBe(`2' 0" × 2' 0"`);
  });
});
