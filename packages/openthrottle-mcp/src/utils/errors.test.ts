import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  classifyError,
  errorCategory,
  extractApplicationErrorDetail,
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

  it('surfaces the actionable detail of an application-level GraphQL error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error(
      'GraphQL errors: Unknown plan status: "DRAFT". Valid statuses: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, QUEUED, SKIPPED.',
    );

    const message = toSanitizedClientMessage('list_plans_by_status', error);

    expect(message).toBe(
      'Unknown plan status: "DRAFT". Valid statuses: BACKLOG, BLOCKED, CANCELED, COMPLETED, IN_PROGRESS, PENDING, QUEUED, SKIPPED.',
    );
    expect(spy).toHaveBeenCalledWith(
      '[openthrottle-mcp] list_plans_by_status failed (validation):',
      error,
    );
  });

  it('still sanitizes a transport/5xx GraphQL error (no backend detail leaks)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error(
      'openthrottle-server GraphQL error 500: connect to 10.0.0.42:6020 failed',
    );

    const message = toSanitizedClientMessage('get_plan', error);

    expect(message).not.toContain('10.0.0.42');
    expect(message).toBe(sanitizedMessageForCategory(errorCategory.unknown));
  });
});

describe('extractApplicationErrorDetail', () => {
  it('extracts the detail from a "GraphQL errors:" application error', () => {
    expect(
      extractApplicationErrorDetail('GraphQL errors: Plan not found: abc'),
    ).toBe('Plan not found: abc');
  });

  it('extracts the detail from a 400/422 client error', () => {
    expect(
      extractApplicationErrorDetail(
        'openthrottle-server GraphQL error 422: bad input here',
      ),
    ).toBe('bad input here');
  });

  it('returns null for transport / 5xx / plain errors', () => {
    expect(
      extractApplicationErrorDetail('connect ECONNREFUSED 127.0.0.1:6020'),
    ).toBeNull();
    expect(
      extractApplicationErrorDetail(
        'openthrottle-server GraphQL error 500: boom',
      ),
    ).toBeNull();
    expect(extractApplicationErrorDetail('GraphQL errors: unknown')).toBeNull();
  });

  it('returns only the first line, dropping any multi-line stack text', () => {
    expect(
      extractApplicationErrorDetail(
        'GraphQL errors: Bad thing\n    at foo (secret.ts:1:1)',
      ),
    ).toBe('Bad thing');
  });
});
