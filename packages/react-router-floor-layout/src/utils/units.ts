/**
 * Pure display-unit formatting. The model is always inches; these helpers turn
 * an inch measurement into a human label in the configured {@link DisplayUnit}.
 */

import { DisplayUnit } from '../types';

const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

/**
 * Format an inch measurement as a label in the given display unit.
 * `ft-in` → `2' 6"`, `cm` → `61 cm`, `m` → `0.61 m`.
 *
 * @publicApi
 */
export function formatInches(inches: number, unit: DisplayUnit): string {
  switch (unit) {
    case DisplayUnit.CM:
      return `${Math.round(inches * CM_PER_INCH)} cm`;
    case DisplayUnit.M:
      return `${(inches * (CM_PER_INCH / 100)).toFixed(2)} m`;
    case DisplayUnit.FT_IN: {
      const totalInches = Math.round(inches);
      const feet = Math.floor(totalInches / INCHES_PER_FOOT);
      const remainder = totalInches - feet * INCHES_PER_FOOT;
      return `${feet}' ${remainder}"`;
    }
  }
}

/**
 * Format a width × height pair as a single dimension label, e.g. `2' 0" × 2' 0"`.
 *
 * @publicApi
 */
export function formatDimensions(
  width: number,
  height: number,
  unit: DisplayUnit,
): string {
  return `${formatInches(width, unit)} × ${formatInches(height, unit)}`;
}
