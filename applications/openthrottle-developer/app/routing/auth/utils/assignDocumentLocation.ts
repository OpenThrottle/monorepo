/**
 * @description A full-document navigation to `url` (not an SPA navigate), so the root loader
 * re-runs server-side with whatever cookie the last response set. Its own module so tests can
 * mock it: jsdom will not let a test redefine `window.location`.
 */
export const assignDocumentLocation = (url: string): void => {
  window.location.assign(url);
};
