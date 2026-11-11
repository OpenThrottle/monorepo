/**
 * @description Stored fragment `properties`, still untrusted JSON.
 */
type Properties = Readonly<Record<string, unknown>>;

/**
 * @description A string property, or `fallback` when it is missing or not a string.
 * @public
 */
export const readString = (
  properties: Properties,
  key: string,
  fallback: string,
): string => {
  const value = properties[key];

  return typeof value === 'string' ? value : fallback;
};

/**
 * @description A string property, or `undefined` when it is missing or not a string.
 * @public
 */
export const readOptionalString = (
  properties: Properties,
  key: string,
): string | undefined => {
  const value = properties[key];

  return typeof value === 'string' ? value : undefined;
};

/**
 * @description A property restricted to `options`, or `fallback` when it holds anything else.
 * @public
 */
export const readOneOf = <TOption extends string>(
  properties: Properties,
  key: string,
  options: readonly TOption[],
  fallback: TOption,
): TOption => {
  const value = properties[key];
  const match = options.find((option) => {
    return option === value;
  });

  return match ?? fallback;
};

/**
 * @description The string items of a list property; anything else reads as an empty list.
 * @public
 */
export const readStringList = (
  properties: Properties,
  key: string,
): readonly string[] => {
  const value = properties[key];
  const list: readonly unknown[] = Array.isArray(value) ? value : [];

  return list.filter((item) => {
    return typeof item === 'string';
  });
};

/**
 * @description An object property of string values; non-string values are dropped.
 * @public
 */
export const readStringRecord = (
  properties: Properties,
  key: string,
): Readonly<Record<string, string>> => {
  const value = properties[key];
  const isObject =
    typeof value === 'object' && value !== null && !Array.isArray(value);
  const entries = isObject ? Object.entries(value) : [];

  return Object.fromEntries(
    entries.filter((entry): entry is [string, string] => {
      return typeof entry[1] === 'string';
    }),
  );
};
