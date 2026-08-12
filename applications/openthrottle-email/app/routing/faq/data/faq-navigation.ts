import { docsManifest } from '~/routing/docs/data/docsManifest';

/** Manifest entries in the `faq` section. */
export const faqEntries = docsManifest.filter(
  (entry) => entry.section === 'faq',
);
