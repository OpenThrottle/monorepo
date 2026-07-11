import type { DocEntry, DocsSection } from './buildDocsManifest';

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
