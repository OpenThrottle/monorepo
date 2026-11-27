import { AGENT_CONVERSATION_MESSAGE_ATTACHMENT_MIME_TYPES } from '@openthrottle/nestjs-repositories-server';

/** Overrides where attachments live. `~` is expanded; blank means the default. */
export const ATTACHMENTS_DIR_ENV_VAR = 'OPENTHROTTLE_ATTACHMENTS_DIR';

/**
 * The default attachments root under `$HOME`. `homedir()` is read at call time, not module load,
 * so a test can point `$HOME` at a temp directory and every worktree sharing one `$HOME` shares
 * one store.
 */
export const DEFAULT_ATTACHMENTS_RELATIVE_PATH = '.openthrottle/attachments';

/** The largest image the store accepts: 10 MiB. Exported so an HTTP controller can cap the body. */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** The directory is owner-only, and so is every file in it. */
export const ATTACHMENT_DIRECTORY_MODE = 0o700;
export const ATTACHMENT_FILE_MODE = 0o600;

/** The extensions the store writes, keyed by sniffed image type. The only allowlist. */
export const ATTACHMENT_EXTENSION = {
  GIF: 'gif',
  JPG: 'jpg',
  PNG: 'png',
  WEBP: 'webp',
} as const;

export type AttachmentExtensionKey = keyof typeof ATTACHMENT_EXTENSION;
export type AttachmentExtensionValue =
  (typeof ATTACHMENT_EXTENSION)[AttachmentExtensionKey];

/**
 * The MIME type the server reports for each stored extension (never the client's claim). Derived
 * from the table's allowed set so the two cannot drift.
 */
export const ATTACHMENT_MIME_TYPE = {
  [ATTACHMENT_EXTENSION.GIF]:
    AGENT_CONVERSATION_MESSAGE_ATTACHMENT_MIME_TYPES.gif,
  [ATTACHMENT_EXTENSION.JPG]:
    AGENT_CONVERSATION_MESSAGE_ATTACHMENT_MIME_TYPES.jpeg,
  [ATTACHMENT_EXTENSION.PNG]:
    AGENT_CONVERSATION_MESSAGE_ATTACHMENT_MIME_TYPES.png,
  [ATTACHMENT_EXTENSION.WEBP]:
    AGENT_CONVERSATION_MESSAGE_ATTACHMENT_MIME_TYPES.webp,
} as const;

export type AttachmentMimeTypeKey = keyof typeof ATTACHMENT_MIME_TYPE;
export type AttachmentMimeTypeValue =
  (typeof ATTACHMENT_MIME_TYPE)[AttachmentMimeTypeKey];

/** Why a store call refused or failed. */
export const ATTACHMENT_STORE_FAILURE = {
  INVALID_EXT: 'invalid-ext',
  INVALID_SHA: 'invalid-sha',
  IO_ERROR: 'io-error',
  NOT_FOUND: 'not-found',
  NOT_REGULAR_FILE: 'not-regular-file',
  OUTSIDE_ROOT: 'outside-root',
  TOO_LARGE: 'too-large',
  UNSUPPORTED_TYPE: 'unsupported-type',
} as const;

export type AttachmentStoreFailureKey = keyof typeof ATTACHMENT_STORE_FAILURE;
export type AttachmentStoreFailureValue =
  (typeof ATTACHMENT_STORE_FAILURE)[AttachmentStoreFailureKey];

/** The prefix of an in-flight write; a janitor may reap these. */
export const ATTACHMENT_TEMP_PREFIX = '.tmp-';
