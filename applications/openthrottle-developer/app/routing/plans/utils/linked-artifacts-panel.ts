/**
 * @description Date-scalar helpers for {@link LinkedArtifactsPanel}. The
 * GraphQL Date scalar arrives as epoch millis (number) or an ISO string; these
 * coerce, order, and format it. Hoisted out of the component per
 * component-primitive-shape R4.
 */

/** Coerce the Date scalar (number epoch millis | string) to a Date; matches the TaskDetails pattern. */
export const toDate = (value: number | string): Date =>
  typeof value === 'number' ? new Date(value) : new Date(String(value));

/** Millis for sorting; invalid dates sort as 0. */
export const toMillis = (value: number | string): number => {
  const time = toDate(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/** Locale-formatted producedAt; falls back to the raw value when unparsable. */
export const formatProducedAt = (value: number | string): string => {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};
