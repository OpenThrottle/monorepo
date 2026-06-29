import { describe, expect, it } from 'vitest';
import {
  deriveQueueJobLogLevel,
  extractQueueJobLogMessage,
} from './queue-job-log-mapping';

describe('deriveQueueJobLogLevel', () => {
  it('maps stream type when data is a plain string', () => {
    expect(deriveQueueJobLogLevel({ data: 'x', type: 'stdout' })).toBe('info');
    expect(deriveQueueJobLogLevel({ data: 'x', type: 'stderr' })).toBe('warn');
    expect(deriveQueueJobLogLevel({ data: 'x', type: 'meta' })).toBe('debug');
  });

  it('defaults unknown types to info', () => {
    expect(deriveQueueJobLogLevel({ data: 'x', type: 'whatever' })).toBe(
      'info',
    );
  });

  it('prefers an explicit recognized level on structured data', () => {
    expect(
      deriveQueueJobLogLevel({ data: { level: 'error' }, type: 'stdout' }),
    ).toBe('error');
    expect(
      deriveQueueJobLogLevel({ data: { level: 'debug' }, type: 'stderr' }),
    ).toBe('debug');
  });

  it('ignores an unrecognized level field and falls back to type', () => {
    expect(
      deriveQueueJobLogLevel({ data: { level: 'trace' }, type: 'stderr' }),
    ).toBe('warn');
  });

  it('never blanket-maps stderr to error', () => {
    expect(deriveQueueJobLogLevel({ data: 'boom', type: 'stderr' })).not.toBe(
      'error',
    );
  });
});

describe('extractQueueJobLogMessage', () => {
  it('trims a string payload', () => {
    expect(extractQueueJobLogMessage('  hello \n')).toBe('hello');
  });

  it('prefers message then msg on object payloads', () => {
    expect(extractQueueJobLogMessage({ message: 'from message' })).toBe(
      'from message',
    );
    expect(extractQueueJobLogMessage({ msg: 'from msg' })).toBe('from msg');
    expect(extractQueueJobLogMessage({ message: 'wins', msg: 'loses' })).toBe(
      'wins',
    );
  });

  it('falls back to JSON for objects without a message/msg string', () => {
    expect(extractQueueJobLogMessage({ detail: 42 })).toBe('{"detail":42}');
    // a non-string message field is not used verbatim
    expect(extractQueueJobLogMessage({ message: 123 })).toBe('{"message":123}');
  });
});
