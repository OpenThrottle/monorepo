import { describe, expect, it } from 'vitest';

import { PLAN_OUTPUT_STREAM_KINDS } from '../plan-output-stream.constants.ts';
import { isPlanOutputStreamKind } from './output-kind.utils.ts';

describe('isPlanOutputStreamKind', () => {
  it.each(PLAN_OUTPUT_STREAM_KINDS)('accepts %s', (kind) => {
    expect(isPlanOutputStreamKind(kind)).toBe(true);
  });

  it.each(['', 'LOOP', 'agent'])('rejects %j', (value) => {
    expect(isPlanOutputStreamKind(value)).toBe(false);
  });
});
