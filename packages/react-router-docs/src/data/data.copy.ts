/**
 * @description Headings of the docs search palette's result groups, keyed by
 * the manifest section they list.
 */
export const DOCS_SECTION_HEADINGS = {
  docs: 'Docs',
  faq: 'FAQ',
} as const;

export type DocsSectionHeadingsKey = keyof typeof DOCS_SECTION_HEADINGS;
export type DocsSectionHeadingsValue =
  (typeof DOCS_SECTION_HEADINGS)[DocsSectionHeadingsKey];
