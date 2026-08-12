import { buildFaqCategories } from '@openthrottle/react-router-docs';
import { docsManifest } from '~/routing/docs/data/docsManifest';

/** Manifest entries in the `faq` section. */
export const faqEntries = docsManifest.filter(
  (entry) => entry.section === 'faq',
);

/** Grouped FAQ categories derived from {@link faqEntries}. */
export const faqCategories = buildFaqCategories(faqEntries);
