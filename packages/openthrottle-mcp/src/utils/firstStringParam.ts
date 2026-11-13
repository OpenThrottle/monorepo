/**
 * @description Resolves a URI-template parameter that may arrive as a string or a string array to its first string value.
 */
export function firstStringParam(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return undefined;
}
