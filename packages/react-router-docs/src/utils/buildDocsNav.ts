import type { DocEntry, DocsSection } from './buildDocsManifest';

/**
 * Strip a numeric ordering prefix (`"00. "`, `"01. "`, …) from a group label
 * for display. Groups use these prefixes so the package's alphabetical group
 * ordering yields a deliberate sidebar order; they are an ordering device, not
 * part of the human-facing label.
 *
 * @public
 */
export const formatGroupLabel = (label: string): string =>
  label.replace(/^\d+\.\s*/u, '');

/**
 * A single navigable link within a nav group. @public
 */
export interface DocsNavItem {
  readonly path: string;
  readonly title: string;
}

/**
 * A labeled group of nav items (a sidebar section). @public
 */
export interface DocsNavGroup {
  readonly items: readonly DocsNavItem[];
  readonly label: string;
}

/**
 * Derive the grouped sidebar navigation for one section from a manifest. Items
 * preserve the manifest's per-group ordering (order, then title); groups are
 * listed alphabetically by label (see the content convention §5). The manifest
 * is already sorted, so this only partitions and labels it.
 *
 * @public
 */
export const buildDocsNav = (
  manifest: readonly DocEntry[],
  section: DocsSection,
): readonly DocsNavGroup[] => {
  const groups = new Map<string, DocsNavItem[]>();

  for (const entry of manifest) {
    if (entry.section !== section) continue;
    const items = groups.get(entry.group) ?? [];

    items.push({ path: entry.path, title: entry.title });
    groups.set(entry.group, items);
  }

  return [...groups.entries()]
    .map(([label, items]): DocsNavGroup => ({ items, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

/** Prev/next neighbors of a page within the flat nav sequence. @public */
export interface DocPager {
  readonly next: DocsNavItem | null;
  readonly prev: DocsNavItem | null;
}

/**
 * Flatten grouped nav into a single ordered sequence — the reading order used
 * for prev/next paging. Preserves group order (alphabetical by label) and each
 * group's internal order (from {@link buildDocsNav}).
 *
 * @public
 */
export const flattenDocsNav = (
  groups: readonly DocsNavGroup[],
): readonly DocsNavItem[] => groups.flatMap((group) => group.items);

/**
 * Resolve the previous/next pages for `currentPath` within an ordered
 * sequence (see {@link flattenDocsNav}). Returns `null` at each boundary (no
 * prev on the first page, no next on the last) and `null`/`null` when the path
 * is not in the sequence.
 *
 * @public
 */
export const getDocPager = (
  sequence: readonly DocsNavItem[],
  currentPath: string,
): DocPager => {
  const index = sequence.findIndex((item) => item.path === currentPath);

  if (index === -1) {
    return { next: null, prev: null };
  }

  return {
    next: index < sequence.length - 1 ? sequence[index + 1] : null,
    prev: index > 0 ? sequence[index - 1] : null,
  };
};
