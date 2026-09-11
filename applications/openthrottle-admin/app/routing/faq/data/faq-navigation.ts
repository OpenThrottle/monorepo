import type { DocEntry } from '@openthrottle/react-router-docs';

import { docsManifest } from '~/routing/docs/data/docsManifest';

/** Manifest entries in the `faq` section. */
export const faqEntries: readonly DocEntry[] = docsManifest.filter(
  (entry) => entry.section === 'faq',
);
