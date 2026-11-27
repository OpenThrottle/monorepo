/** The multipart field the client puts the image in. */
export const ATTACHMENT_UPLOAD_FIELD = 'file';

/** Longest original filename we keep; the rest is cut. */
export const ATTACHMENT_ORIGINAL_NAME_MAX_LENGTH = 255;

/** A year, because a stored attachment's bytes never change under its id. */
export const ATTACHMENT_CACHE_CONTROL = 'private, max-age=31536000, immutable';
