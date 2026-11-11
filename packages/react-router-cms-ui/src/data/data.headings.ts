/**
 * @description Every tag the `Heading` component may render. CMS content can
 * carry any string, so the component checks against this list at runtime.
 */
export const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

/** @description The tag `Heading` renders when given none, or an invalid one. */
export const DEFAULT_HEADING_TAG = 'h2';
