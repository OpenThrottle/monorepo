import type { DocEntry } from './buildDocsManifest';

/**
 * Stable, unique list key for a manifest entry (`section:slug`, with the empty
 * index slug normalized to `index`). Kept here (not inline in a component) so
 * it is discoverable and independently testable (component-primitive-shape R4).
 *
 * @public
 */
export const docEntryKey = (entry: DocEntry): string =>
  `${entry.section}:${entry.slug.length > 0 ? entry.slug : 'index'}`;
