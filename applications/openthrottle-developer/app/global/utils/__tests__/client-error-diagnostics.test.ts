import { describe, expect, test, vi } from 'vitest';
import {
  bucketRouteHttpStatus,
  classifyClientError,
  clientErrorKindLabel,
  createIncidentReferenceId,
  inferJavascriptErrorSubtype,
  isClientStackToggleEligible,
  isUsableRollbarClientToken,
  javascriptErrorBoundaryHint,
  javascriptErrorBoundaryTitle,
  routeHttpErrorSummary,
} from '../client-error-diagnostics';

describe('client-error-diagnostics', () => {
  test('classifyClientError returns http for route error responses', () => {
    expect(
      classifyClientError({
        data: 'gone',
        internal: false,
        status: 410,
        statusText: 'Gone',
      }),
    ).toBe('http');
  });

  test('classifyClientError returns javascript for Error instances', () => {
    expect(classifyClientError(new Error('boom'))).toBe('javascript');
  });

  test('classifyClientError returns unknown for primitive values', () => {
    expect(classifyClientError('string fail')).toBe('unknown');
  });

  test('clientErrorKindLabel returns stable titles', () => {
    expect(clientErrorKindLabel('http')).toMatch(/HTTP/);
    expect(clientErrorKindLabel('javascript')).toMatch(/Application/);
    expect(clientErrorKindLabel('unknown')).toMatch(/Unexpected/);
  });

  test('isUsableRollbarClientToken rejects placeholders and short values', () => {
    expect(isUsableRollbarClientToken(undefined)).toBe(false);
    expect(isUsableRollbarClientToken('')).toBe(false);
    expect(isUsableRollbarClientToken('short')).toBe(false);
    expect(isUsableRollbarClientToken('xxxxxxxxxxxxxxxx')).toBe(false);
    expect(isUsableRollbarClientToken('aaaaaaaaaaaaaaaa')).toBe(false);
    expect(isUsableRollbarClientToken('rollbar-test-token-12345678')).toBe(
      false,
    );
    expect(isUsableRollbarClientToken('my-placeholder-token-here')).toBe(false);
    expect(isUsableRollbarClientToken('abcd1234efgh5678')).toBe(true);
  });

  test('isClientStackToggleEligible reads window.env', () => {
    vi.stubGlobal('window', {
      env: { APP_ENV: 'development', NODE_ENV: 'development' },
    });
    expect(isClientStackToggleEligible()).toBe(true);

    vi.stubGlobal('window', {
      env: { APP_ENV: 'production', NODE_ENV: 'production' },
    });
    expect(isClientStackToggleEligible()).toBe(false);
  });

  test('createIncidentReferenceId returns a non-empty id', () => {
    const id = createIncidentReferenceId();
    expect(id.length).toBeGreaterThan(4);
  });

  test('inferJavascriptErrorSubtype detects chunk load errors', () => {
    const chunkErr = new Error('Loading chunk 7 failed');
    chunkErr.name = 'ChunkLoadError';
    expect(inferJavascriptErrorSubtype(chunkErr)).toBe('chunk_load');
  });

  test('inferJavascriptErrorSubtype detects abort errors', () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    expect(inferJavascriptErrorSubtype(abortErr)).toBe('user_abort');
  });

  test('bucketRouteHttpStatus classifies status ranges', () => {
    expect(bucketRouteHttpStatus(302)).toBe('redirect');
    expect(bucketRouteHttpStatus(404)).toBe('client');
    expect(bucketRouteHttpStatus(502)).toBe('server');
  });

  test('routeHttpErrorSummary maps common statuses', () => {
    expect(routeHttpErrorSummary(500)).toMatch(/Server/);
    expect(routeHttpErrorSummary(404)).toMatch(/Not found/);
    expect(routeHttpErrorSummary(401)).toMatch(/Unauthorized/);
  });

  test('javascriptErrorBoundaryTitle and Hint stay aligned per subtype', () => {
    expect(javascriptErrorBoundaryTitle('chunk_load')).toBeTruthy();
    expect(javascriptErrorBoundaryHint('generic')).toContain(
      'Something went wrong',
    );
  });
});
