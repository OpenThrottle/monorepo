import { getApiBaseUrl } from '@openthrottle/react-router-graphql';

import { ATTACHMENT_UPLOAD_MAX_REQUEST_BYTES } from '~/global/config/attachment-proxy';

/**
 * @description Shared pieces of the `/resources/attachments` proxy routes,
 * which forward image uploads and downloads to openthrottle-server's REST
 * `/attachments` endpoints with the caller's bearer token. Server-only.
 */

/** Upstream headers the proxy hands to the browser; everything else is dropped. */
export const ATTACHMENT_PASSTHROUGH_HEADERS = [
  'Cache-Control',
  'Content-Type',
  'X-Content-Type-Options',
] as const;

/**
 * Whether a request may reach the upload proxy: it carries no `Origin` header
 * (non-browser or same-origin GET) or its `Origin` host matches the request URL's
 * host. A cross-site form post (CSRF) is refused.
 */
export const isSameOriginRequest = (request: Request): boolean => {
  const origin = request.headers.get('origin');
  if (origin === null) {
    return true;
  }
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
};

/** A JSON error response in the shape the proxy routes share. */
export const attachmentErrorResponse = (
  message: string,
  status: number,
): Response => {
  return Response.json({ error: message }, { status });
};

/** `${API_URL_INTERNAL}/attachments[/<id>]`, the id URL-encoded. */
export const buildAttachmentsUpstreamUrl = (id?: string): string => {
  const base = `${getApiBaseUrl()}/attachments`;

  return id === undefined ? base : `${base}/${encodeURIComponent(id)}`;
};

/**
 * Whether a request declares a body larger than the upload limit. A missing or
 * unparseable `Content-Length` (chunked) is not oversized: the server still
 * enforces its own limit.
 */
export const isOversizedUpload = (request: Request): boolean => {
  const header = request.headers.get('content-length');
  if (header === null) {
    return false;
  }
  const length = Number(header);

  return (
    Number.isFinite(length) && length > ATTACHMENT_UPLOAD_MAX_REQUEST_BYTES
  );
};
