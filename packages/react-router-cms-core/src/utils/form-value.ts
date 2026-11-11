/**
 * @description A stored property value as the text an input shows: strings as-is, finite numbers
 * stringified, anything else empty.
 * @public
 */
export const toInputValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return '';
};

/**
 * @description A stored property value as a list: arrays as-is, anything else empty.
 * @public
 */
export const toListValue = (value: unknown): readonly unknown[] => {
  return Array.isArray(value) ? value : [];
};

/**
 * @description The option values of a schema `enum`, as the strings a select works with. Values that
 * are not strings or numbers are dropped.
 * @public
 */
export const toEnumOptions = (
  options: readonly unknown[] | undefined,
): readonly string[] => {
  return (options ?? []).flatMap((option) => {
    const isScalar = typeof option === 'string' || typeof option === 'number';

    return isScalar ? [String(option)] : [];
  });
};

/**
 * @description A readable name for each `anyOf` branch: the definition a `$ref` points at, else
 * the branch `type`, else its position.
 * @public
 */
export const getAnyOfOptionLabels = (
  options: readonly unknown[] | undefined,
): readonly string[] => {
  return (options ?? []).map((option, index) => {
    const isObject = typeof option === 'object' && option !== null;
    const ref = isObject && '$ref' in option ? option.$ref : undefined;
    const type = isObject && 'type' in option ? option.type : undefined;

    if (typeof ref === 'string') {
      return ref.replace('#/definitions/', '');
    }

    return typeof type === 'string' ? type : `Option ${index + 1}`;
  });
};
