/**
 * @description Reads a string field (typically `<name>Error`, also `jobId`)
 * off a route action's returned data, which is `unknown` until narrowed.
 * Returns `undefined` when the data is absent or the field is not a string.
 */
export const readActionError = (
  data: unknown,
  key: string,
): string | undefined => {
  if (data == null || typeof data !== 'object') {
    return undefined;
  }
  const value: unknown = Reflect.get(data, key);
  return typeof value === 'string' ? value : undefined;
};
