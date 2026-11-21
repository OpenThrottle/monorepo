import { describe, expect, test } from 'vitest';

import {
  PROJECT_PLANS_PAGE_LIMIT,
  PROJECTS_DEFAULT_LIMIT,
} from '../projects.defaults';

describe('routing/projects config projects.defaults', () => {
  test('PROJECTS_DEFAULT_LIMIT is a positive integer', () => {
    expect(PROJECTS_DEFAULT_LIMIT).toBe(10);
  });

  test('PROJECT_PLANS_PAGE_LIMIT pages the project detail plans at 50', () => {
    expect(PROJECT_PLANS_PAGE_LIMIT).toBe(50);
  });
});
