/** Accepts any parsed value as `T` — the permissive default validator. */
export const acceptAny = <T>(_value: unknown): _value is T => true;
