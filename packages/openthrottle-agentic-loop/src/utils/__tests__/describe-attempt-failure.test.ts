import { describe, expect, it } from 'vitest';

import {
  describeAttemptFailure,
  firstErrorLine,
} from '../describe-attempt-failure.ts';

describe('firstErrorLine', () => {
  it('prefers the first error-looking line, else the first non-empty line', () => {
    expect(firstErrorLine('\nstart\n  FAIL src/x.test.ts\nlater error')).toBe(
      'FAIL src/x.test.ts',
    );
    expect(firstErrorLine('\n  hello\nworld')).toBe('hello');
    expect(firstErrorLine('')).toBe('');
  });

  it('caps long lines', () => {
    expect(firstErrorLine(`error ${'x'.repeat(400)}`)).toHaveLength(160);
  });
});

describe('describeAttemptFailure', () => {
  it('names the command label, exit code and first error for validation', () => {
    expect(
      describeAttemptFailure({
        command: 'pnpm nx run-many --target=lint',
        exitCode: 2,
        kind: 'validation',
        tail: 'ok\n✗ bad thing',
      }),
    ).toBe('lint exited 2: ✗ bad thing');
  });

  it('uses the first non-empty line for worker and commit failures', () => {
    expect(
      describeAttemptFailure({ kind: 'worker', message: '\n\nboom\nmore' }),
    ).toBe('boom');
    expect(
      describeAttemptFailure({ kind: 'commit', output: 'subject-case\nx' }),
    ).toBe('subject-case');
  });
});
