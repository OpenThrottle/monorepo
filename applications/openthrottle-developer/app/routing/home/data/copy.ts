/** @description Copy for the home route's session drawer and its small-screen trigger. */
export const HOME_SESSION_DRAWER_COPY = {
  changesLoadFailed: 'Could not load changes.',
  sheetDescription: `Running work, context, environment, files and changes for this chat.`,
  show: 'Show session panel (⌘⇧J)',
} as const;

/** @description The hero line an empty home thread shows above the composer. */
export const HOME_HERO_COPY = {
  heading: 'What would you like to build today?',
  tagline: `OpenThrottle is a platform for building software, iteratively, and securely.`,
} as const;

/** @description Copy for the home composer's image attachments (upload errors, send blockers, the disabled tooltip). */
export const HOME_ATTACHMENT_COPY = {
  failed: 'Upload failed. Try again.',
  signedOut: 'Sign in again to attach images.',
  tooLarge: 'Image is too large (10 MB max).',
  tooMany: 'Up to 8 images per message.',
  unsupportedFormat: 'Only PNG, JPEG, GIF or WebP images can be attached.',
  unsupportedModel: `The selected model does not accept images. Pick an image-capable model to attach them.`,
  uploadingBlocker: 'Wait for the image uploads to finish, then send again.',
} as const;
