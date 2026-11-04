/**
 * Ordered batching under two limits at once: an item count and a byte budget.
 * Request bodies are capped by whatever parses them (a framework default, a
 * proxy), so a count alone does not keep a batch deliverable.
 */

/**
 * Split `items` into ordered batches of at most `maxItems` whose summed
 * `sizeOf` stays within `maxBytes`. An item bigger than the whole budget still
 * gets a batch of its own — whether it is too big is the receiver's call, not
 * the splitter's.
 *
 * @public
 */
export const chunkByBudget = <T>(
  items: readonly T[],
  {
    maxBytes,
    maxItems,
    sizeOf,
  }: {
    readonly maxBytes: number;
    readonly maxItems: number;
    readonly sizeOf: (item: T) => number;
  },
): T[][] => {
  const itemLimit = Math.max(1, maxItems);
  const out: T[][] = [];
  let batch: T[] = [];
  let batchBytes = 0;

  for (const item of items) {
    const size = sizeOf(item);
    if (
      batch.length > 0 &&
      (batch.length >= itemLimit || batchBytes + size > maxBytes)
    ) {
      out.push(batch);
      batch = [];
      batchBytes = 0;
    }
    batch.push(item);
    batchBytes += size;
  }

  if (batch.length > 0) {
    out.push(batch);
  }
  return out;
};
