import { describe, expect, test } from 'vitest';
import { PROJECTS_DEFAULT_LIMIT } from '../projects.defaults';

describe('routing/projects config projects.defaults', () => {
  test('PROJECTS_DEFAULT_LIMIT is a positive integer', () => {
    expect(PROJECTS_DEFAULT_LIMIT).toBe(10);
  });
});
