import { describe, expect, test } from 'vitest';
import { DEFAULT_SKILLS } from '~/routing/profile/config/defaults';

describe('routing/profile config defaults', () => {
  test('DEFAULT_SKILLS is a stable sentinel string', () => {
    expect(DEFAULT_SKILLS).toBe('DEFAULT_SKILLS');
  });
});
