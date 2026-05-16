import { describe, expect, test } from 'vitest';
import { DEFAULT_LEGAL } from '~/routing/legal/config/defaults';

describe('routing/legal config defaults', () => {
  test('DEFAULT_LEGAL is a stable sentinel string', () => {
    expect(DEFAULT_LEGAL).toBe('DEFAULT_LEGAL');
  });
});
