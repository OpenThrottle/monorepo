import type { DocEntry } from './buildDocsManifest';

/**
 * One FAQ category: its raw group label and the entries that belong to it.
 *
 * @public
 */
export interface FaqGroup {
  readonly entries: readonly DocEntry[];
  readonly label: string;
}

/**
 * Group FAQ entries by their manifest `group`, sorted by label. Entry order
 * within a group preserves the manifest order. Kept here (not inline in a
 * component) so it is discoverable and independently testable
 * (component-primitive-shape R4).
 *
 * @public
 */
export const groupFaqEntries = (
  entries: readonly DocEntry[],
): readonly FaqGroup[] => {
  const groups = new Map<string, DocEntry[]>();

  for (const entry of entries) {
    const items = groups.get(entry.group) ?? [];
    items.push(entry);
    groups.set(entry.group, items);
  }

  return [...groups.entries()]
    .map(([label, grouped]): FaqGroup => ({ entries: grouped, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
};
