/**
 * @description User-facing copy for the CMS components, single-sourced so the
 * components and their specs read the same strings.
 */
export const COPY = {
  carousel: {
    label: 'Image carousel',
    slideOf: 'of',
    slidePrefix: 'Slide',
  },
  layout: {
    emptyDescription: 'Add some children',
    emptyTitle: 'Empty Layout Component',
  },
  tweet: {
    profileAltPrefix: 'Profile picture of',
    profileAltSuffix: 'on X',
  },
} as const;
