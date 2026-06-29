import { describe, expect, it } from 'vitest';
import { buildRedactedQueueJobLogMessage } from './queue-job-log-redaction';

describe('buildRedactedQueueJobLogMessage', () => {
  it('redacts a Bearer credential interpolated into a log line', () => {
    const out = buildRedactedQueueJobLogMessage(
      'calling API with Authorization: Bearer sk-abc123DEF456',
    );
    expect(out).not.toContain('sk-abc123DEF456');
    expect(out).toContain('[REDACTED]');
  });

  it('redacts a JWT', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.s5pToK3nValuE-xyz';
    const out = buildRedactedQueueJobLogMessage(`token=${jwt} done`);
    expect(out).not.toContain(jwt);
  });

  it('redacts an email address', () => {
    const out = buildRedactedQueueJobLogMessage('notify user@example.com now');
    expect(out).not.toContain('user@example.com');
  });

  it('leaves ordinary run output untouched (and trimmed)', () => {
    expect(buildRedactedQueueJobLogMessage('  building project... \n')).toBe(
      'building project...',
    );
  });

  it('redacts a secret embedded in object data rendered to JSON', () => {
    const out = buildRedactedQueueJobLogMessage({
      detail: 'auth attempt with Bearer ghp_secretTokenValue123',
    });
    expect(out).not.toContain('ghp_secretTokenValue123');
  });

  it('redacts within an object message/msg field', () => {
    const out = buildRedactedQueueJobLogMessage({
      message: 'login as admin@corp.io succeeded',
    });
    expect(out).not.toContain('admin@corp.io');
  });
});
