import { describe, expect, test } from 'vitest';
import { DEFAULT_SKILLS } from '~/routing/skills/config/defaults';

describe('routing/skills config defaults', () => {
  test('DEFAULT_SKILLS is a stable string token', () => {
    expect(DEFAULT_SKILLS).toBe('DEFAULT_SKILLS');
  });
});
