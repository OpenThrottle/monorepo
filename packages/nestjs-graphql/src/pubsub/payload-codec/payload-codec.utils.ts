/**
 * Marker key that wraps a `Date` on the wire. Plain JSON turns a `Date` into an
 * ISO string, and Nest's `DateTime` scalar serializes a string to `null`, so a
 * published entity's `createdAt` would arrive as `null` without the tag.
 */
const DATE_TAG = '$otDate';

const isTaggedDate = (value: unknown): value is Record<string, string> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const keys = Object.keys(value);

  return (
    keys.length === 1 &&
    keys[0] === DATE_TAG &&
    typeof Reflect.get(value, DATE_TAG) === 'string'
  );
};

/**
 * @description Serializes a PubSub payload for a cross-process hop. `Date`
 * values are tagged so {@link decodePubSubPayload} restores them as `Date`
 * rather than leaving the ISO string `JSON.stringify` produces; everything else
 * is plain JSON. Throws what `JSON.stringify` throws (a cycle, a `BigInt`).
 *
 * @public
 */
export const encodePubSubPayload = (payload: unknown): string => {
  return JSON.stringify(
    payload,
    function replacer(this: object, key: string, value: unknown): unknown {
      // `value` is already `Date#toJSON()`'s output; the holder has the original.
      const raw: unknown = Reflect.get(this, key);
      if (raw instanceof Date && typeof value === 'string') {
        return { [DATE_TAG]: value };
      }

      return value;
    },
  );
};

/**
 * @description Inverse of {@link encodePubSubPayload}. Throws on malformed JSON.
 *
 * @public
 */
export const decodePubSubPayload = (message: string): unknown => {
  return JSON.parse(message, (_key: string, value: unknown): unknown => {
    if (isTaggedDate(value)) {
      return new Date(value[DATE_TAG] ?? '');
    }

    return value;
  });
};
