/**
 * Suffix appended to an agent's picker sub-label when discovery reports it is
 * not signed in.
 */
export const AGENT_NOT_SIGNED_IN_SUFFIX = 'not signed in';

/**
 * @description Copy for the chat composers' image attachments (upload errors,
 * send blockers, the disabled tooltip).
 * @public
 */
export const CHAT_ATTACHMENT_COPY = {
  failed: 'Upload failed. Try again.',
  signedOut: 'Sign in again to attach images.',
  tooLarge: 'Image is too large (10 MB max).',
  tooMany: 'Up to 8 images per message.',
  unsupportedFormat: 'Only PNG, JPEG, GIF or WebP images can be attached.',
  unsupportedModel: `The selected model does not accept images. Pick an image-capable model to attach them.`,
  uploadingBlocker: 'Wait for the image uploads to finish, then send again.',
} as const;
