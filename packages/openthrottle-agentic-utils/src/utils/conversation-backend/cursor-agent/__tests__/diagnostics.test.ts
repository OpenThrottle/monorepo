import { describe, expect, it } from 'vitest';

import {
  describeCapturedStream,
  formatCursorMintFailure,
  MAX_CAPTURED_STREAM_CHARS,
  redactCursorSecrets,
} from '../diagnostics.ts';

describe('redactCursorSecrets', () => {
  it('redacts the literal CURSOR_API_KEY value wherever it appears', () => {
    const redacted = redactCursorSecrets(
      'loaded key sk-live-abc from env; retry with sk-live-abc',
      { CURSOR_API_KEY: 'sk-live-abc' },
    );

    expect(redacted).not.toContain('sk-live-abc');
    expect(redacted).toBe(
      'loaded key [REDACTED] from env; retry with [REDACTED]',
    );
  });

  it('redacts the literal CURSOR_AUTH_TOKEN value', () => {
    expect(
      redactCursorSecrets('token=tok-value-1', {
        CURSOR_AUTH_TOKEN: 'tok-value-1',
      }),
    ).toBe('token=[REDACTED]');
  });

  it('ignores an unset or blank secret env var instead of redacting everything', () => {
    expect(
      redactCursorSecrets('nothing secret here', { CURSOR_API_KEY: '' }),
    ).toBe('nothing secret here');
  });

  it('redacts token-shaped values with no env var to match against', () => {
    const redacted = redactCursorSecrets(
      'Authorization: Bearer abc.def-123 and key_0123456789abcdefghij',
      {},
    );

    expect(redacted).not.toContain('abc.def-123');
    expect(redacted).not.toContain('key_0123456789abcdefghij');
  });

  it('redacts a JWT', () => {
    expect(redactCursorSecrets('eyJhbGciOi.eyJzdWIiOi.SflKxwRJSM', {})).toBe(
      '[REDACTED]',
    );
  });
});

describe('describeCapturedStream', () => {
  it('marks an empty stream instead of printing empty quotes', () => {
    expect(describeCapturedStream('')).toBe('<empty>');
  });

  it('preserves ANSI escapes and CRLFs as visible escapes', () => {
    const described = describeCapturedStream('\u001b[33m! warn\u001b[0m\r\n');

    expect(described).toContain('\\u001b[33m');
    expect(described).toContain('\\r\\n');
  });

  it('truncates and reports how much was elided', () => {
    const described = describeCapturedStream(
      'x'.repeat(MAX_CAPTURED_STREAM_CHARS + 10),
    );

    expect(described).toContain('(+10 chars elided)');
  });

  it('redacts before truncating', () => {
    expect(
      describeCapturedStream('Authorization: Bearer supersecrettoken'),
    ).not.toContain('supersecrettoken');
  });
});

describe('formatCursorMintFailure', () => {
  const details = {
    bin: '/usr/local/bin/cursor-agent',
    cwd: '/work/repo',
    elapsedMs: 1234,
    reason: 'failed (exit 1)',
    stderr: 'Error: Authentication required.',
    stdout: '',
  };

  it('carries the binary, cwd, duration, and BOTH streams', () => {
    const message = formatCursorMintFailure(details);

    expect(message).toContain('bin=/usr/local/bin/cursor-agent');
    expect(message).toContain('cwd=/work/repo');
    expect(message).toContain('elapsedMs=1234');
    expect(message).toContain('stdout=<empty>');
    expect(message).toContain('Authentication required');
    expect(message).toContain('cursor-agent create-chat failed (exit 1)');
  });

  it('redacts a token-shaped value that reached stdout', () => {
    const message = formatCursorMintFailure({
      ...details,
      stdout: 'using key_0123456789abcdefghij',
    });

    expect(message).not.toContain('key_0123456789abcdefghij');
    expect(message).toContain('[REDACTED]');
  });
});
