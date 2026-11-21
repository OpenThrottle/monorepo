/**
 * @description An `exports` condition object whose keys are out of order
 */
export interface ConditionOrderViolation {
  /** The condition keys as written, e.g. `['import', 'require', 'types']` */
  readonly keys: readonly string[];
  /** Where the object sits, e.g. `exports["./nest"]` */
  readonly location: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isOutOfOrder = (keys: readonly string[]): boolean => {
  const typesIndex = keys.indexOf('types');
  const defaultIndex = keys.indexOf('default');
  const typesNotFirst = typesIndex > 0;
  const defaultNotLast =
    defaultIndex !== -1 && defaultIndex !== keys.length - 1;

  return typesNotFirst || defaultNotLast;
};

/**
 * @description Walks an `exports` map and returns every condition object that
 * lists `types` anywhere but first or `default` anywhere but last. Conditions
 * match in written order, so a key after `default` is unreachable, and a
 * `types` after `import`/`require` is only found by luck.
 * Subpath keys (those starting with `.`) are descended into, never judged.
 */
export const findConditionOrderViolations = (
  value: unknown,
  location: string,
): readonly ConditionOrderViolation[] => {
  if (!isRecord(value)) {
    return [];
  }

  const keys = Object.keys(value);
  const isConditionObject = keys.some((key) => !key.startsWith('.'));
  const own =
    isConditionObject && isOutOfOrder(keys) ? [{ keys, location }] : [];
  const nested = Object.entries(value).flatMap(([key, child]) => {
    const childLocation = isConditionObject
      ? `${location}.${key}`
      : `${location}["${key}"]`;

    return findConditionOrderViolations(child, childLocation);
  });

  return [...own, ...nested];
};
