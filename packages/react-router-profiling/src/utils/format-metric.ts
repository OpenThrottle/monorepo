/**
 * @description Number formatters for server / task-run metric display. Shared
 * by the metrics cards; kept here (not inline in a component) so they are
 * discoverable and unit-tested on their own (component-primitive-shape R4).
 */

/**
 * Format MB to 2 decimal places for display.
 */
export const formatMb = (value: number): string => {
  return value.toFixed(2);
};

/**
 * Format CPU ms (cumulative or delta) for display; integer when reasonable.
 */
export const formatCpuMs = (value: number): string => {
  return Number(value.toFixed(0)).toLocaleString();
};
