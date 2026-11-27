/** Largest image openthrottle-server accepts (10 MiB). */
const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** Multipart framing allowance (boundaries, part headers) over the file bytes. */
const ATTACHMENT_MULTIPART_OVERHEAD_BYTES = 64 * 1024;

/**
 * Largest upload request body the proxy reads into memory: the attachment size
 * limit plus multipart overhead. A larger declared `Content-Length` is a 413.
 */
export const ATTACHMENT_UPLOAD_MAX_REQUEST_BYTES =
  ATTACHMENT_MAX_BYTES + ATTACHMENT_MULTIPART_OVERHEAD_BYTES;
