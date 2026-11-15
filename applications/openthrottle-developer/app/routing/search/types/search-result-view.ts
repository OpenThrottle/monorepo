import type { SearchSource } from '~/routing/search/utils/normalizeSource';

/** Where a result's title goes: an in-app route, an external page, or nowhere. */
export type SearchResultTarget =
  | { readonly href: string; readonly kind: 'external' }
  | { readonly href: string; readonly kind: 'internal' }
  | { readonly kind: 'none' };

/** The secondary link on a result's meta line (a task's plan, a plan chunk's task, a doc's repo). */
export interface SearchResultContext {
  readonly label: string;
  readonly target: SearchResultTarget;
}

/** Everything a result card needs to render one header layout for every source. */
export interface SearchResultView {
  readonly context: SearchResultContext | null;
  readonly relevancePercent: number;
  /** The content without a leading copy of the title, which chunk text usually starts with. */
  readonly snippet: string;
  readonly source: SearchSource;
  readonly target: SearchResultTarget;
  readonly title: string;
}
