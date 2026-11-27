// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

import { ATTACHMENT_UPLOAD_MAX_REQUEST_BYTES } from '~/global/config/attachment-proxy';

vi.mock('@openthrottle/react-router-graphql', () => ({
  getApiBaseUrl: () => 'http://api.internal',
}));

const {
  attachmentErrorResponse,
  buildAttachmentsUpstreamUrl,
  isOversizedUpload,
  isSameOriginRequest,
} = await import('../attachment-proxy.server');

const requestWith = (headers: Record<string, string>): Request => {
  return new Request('http://localhost/resources/attachments', {
    headers,
    method: 'POST',
  });
};

describe('isSameOriginRequest', () => {
  test('allows a request without an Origin header', () => {
    expect(isSameOriginRequest(requestWith({}))).toBe(true);
  });

  test('allows a matching Origin host', () => {
    expect(
      isSameOriginRequest(requestWith({ origin: 'http://localhost' })),
    ).toBe(true);
  });

  test('refuses a different Origin host', () => {
    expect(
      isSameOriginRequest(requestWith({ origin: 'http://evil.example' })),
    ).toBe(false);
  });

  test('refuses an unparseable Origin', () => {
    expect(isSameOriginRequest(requestWith({ origin: 'not a url' }))).toBe(
      false,
    );
  });
});

describe('isOversizedUpload', () => {
  test('is false without a Content-Length', () => {
    expect(isOversizedUpload(requestWith({}))).toBe(false);
  });

  test('is false at the limit', () => {
    const headers = {
      'content-length': String(ATTACHMENT_UPLOAD_MAX_REQUEST_BYTES),
    };

    expect(isOversizedUpload(requestWith(headers))).toBe(false);
  });

  test('is true one byte over the limit', () => {
    const headers = {
      'content-length': String(ATTACHMENT_UPLOAD_MAX_REQUEST_BYTES + 1),
    };

    expect(isOversizedUpload(requestWith(headers))).toBe(true);
  });

  test('is false for a non-numeric Content-Length', () => {
    expect(isOversizedUpload(requestWith({ 'content-length': 'abc' }))).toBe(
      false,
    );
  });
});

describe('attachmentErrorResponse', () => {
  test('is a JSON error with the status', async () => {
    const response = attachmentErrorResponse('nope', 413);

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'nope' });
  });
});

describe('buildAttachmentsUpstreamUrl', () => {
  test('is the collection URL without an id', () => {
    expect(buildAttachmentsUpstreamUrl()).toBe(
      'http://api.internal/attachments',
    );
  });

  test('url-encodes the id', () => {
    expect(buildAttachmentsUpstreamUrl('a/b')).toBe(
      'http://api.internal/attachments/a%2Fb',
    );
  });
});
