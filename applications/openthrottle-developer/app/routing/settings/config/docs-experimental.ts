import type { DocsFeatureFlagKey } from '~/global/config/docs-feature-flags';

/** One row in the "Docs (experimental)" settings panel. */
export interface DocsExperimentalRow {
  readonly description: string;
  readonly key: DocsFeatureFlagKey;
  readonly label: string;
}

/**
 * @description Display rows for the docs feature-flag toggles, in the order they
 * appear in Settings → Debug. `key` maps to a {@link DocsFeatureFlagKey}; the
 * label/description are the surfaced copy (see docs/openthrottle/docs-faq-refresh.md §5).
 */
export const DOCS_EXPERIMENTAL_ROWS: readonly DocsExperimentalRow[] = [
  {
    description: 'Command-palette search across docs and FAQ (⌘K / Ctrl-K).',
    key: 'search',
    label: 'Search',
  },
  {
    description:
      'Right-rail table of contents with scroll-spy and copy-anchor links.',
    key: 'toc',
    label: 'On-page contents',
  },
  {
    description: 'Sequential prev / next links between docs pages.',
    key: 'prevNext',
    label: 'Prev / next',
  },
  {
    description: 'Copy-to-clipboard button on fenced code blocks.',
    key: 'codeCopy',
    label: 'Copy code',
  },
  {
    description: 'Card overview on /docs and a category hero on /faq.',
    key: 'landing',
    label: 'Rich landing',
  },
];
