import { slugify } from './slugify';
import type { DocEntry } from './buildDocsManifest';

/** A FAQ category: its raw group label plus the anchor id its section carries. */
export interface FaqCategory {
  /** Anchor id — matches the `id` FaqView puts on the group `<section>`. */
  readonly id: string;
  /** Raw group label (may carry a numeric ordering prefix). */
  readonly label: string;
}

/**
 * Derive the ordered, de-duplicated FAQ categories from FAQ entries. Order
 * matches FaqView's grouping (alphabetical by label), and ids come from the
 * shared {@link slugify} so a category link agrees with its section's anchor.
 *
 * @public
 */
export const buildFaqCategories = (
  entries: readonly DocEntry[],
): readonly FaqCategory[] => {
  const labels = new Set<string>();
  for (const entry of entries) {
    labels.add(entry.group);
  }

  return [...labels]
    .sort((a, b) => a.localeCompare(b))
    .map((label) => ({ id: slugify(label), label }));
};
