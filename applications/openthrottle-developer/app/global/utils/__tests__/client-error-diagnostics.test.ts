import { describe, expect, test, vi } from 'vitest';
import {
  classifyClientError,
  clientErrorKindLabel,
  createIncidentReferenceId,
  isClientStackToggleEligible,
  isUsableRollbarClientToken,
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
});
