import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  classifyError,
  errorCategory,
  sanitizedMessageForCategory,
  toSanitizedClientMessage,
} from './errors.ts';

describe('classifyError', () => {
  it('classifies auth errors', () => {
    expect(classifyError(new Error('401 Unauthorized'))).toBe(
      errorCategory.auth,
    );
    expect(
      classifyError(new Error('Auth token required for OpenThrottle')),
    ).toBe(errorCategory.auth);
  });

  it('classifies validation errors', () => {
    expect(classifyError(new Error('400 Bad Request'))).toBe(
      errorCategory.validation,
    );
    expect(classifyError(new Error('invalid id'))).toBe(
      errorCategory.validation,
    );
  });

  it('classifies transport errors', () => {
    expect(
      classifyError(new Error('connect ECONNREFUSED 127.0.0.1:6020')),
    ).toBe(errorCategory.transport);
    expect(classifyError(new Error('fetch failed'))).toBe(
      errorCategory.transport,
    );
  });

  it('falls back to unknown', () => {
    expect(classifyError(new Error('something weird'))).toBe(
      errorCategory.unknown,
    );
    expect(classifyError('not an error object')).toBe(errorCategory.unknown);
  });
});

describe('sanitizedMessageForCategory', () => {
  it('returns a stable message that never echoes backend detail', () => {
    const transport = sanitizedMessageForCategory(errorCategory.transport);
    expect(transport).not.toContain('127.0.0.1');
    expect(transport).not.toContain('6020');
    expect(transport).not.toContain('ECONNREFUSED');
  });
});

describe('toSanitizedClientMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs full detail to stderr but returns only the sanitized message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('connect ECONNREFUSED 127.0.0.1:6020');

    const message = toSanitizedClientMessage('health', error);

    expect(message).toBe(sanitizedMessageForCategory(errorCategory.transport));
    expect(message).not.toContain('127.0.0.1');
    expect(spy).toHaveBeenCalledWith(
      '[openthrottle-mcp] health failed (transport):',
      error,
    );
  });
});
