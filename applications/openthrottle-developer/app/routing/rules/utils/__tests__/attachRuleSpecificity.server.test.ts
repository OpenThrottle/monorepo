// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { attachRuleSpecificity } from '../attachRuleSpecificity.server';

describe('attachRuleSpecificity', () => {
  test('scores a global, unqualified rule as zero', () => {
    const [rule] = attachRuleSpecificity([{ id: 'a', tagAll: [] }]);

    expect(rule?.specificity).toBe(0);
  });

  test('scores a repository-scoped rule higher than a global one', () => {
    const [global, scoped] = attachRuleSpecificity([
      { repositoryId: null, tagAll: ['x'] },
      { repositoryId: 'repo-1', tagAll: ['x'] },
    ]);

    expect(scoped?.specificity).toBeGreaterThan(global?.specificity ?? 0);
  });

  test('scores a project-scoped rule higher than a global one', () => {
    const [global, scoped] = attachRuleSpecificity([
      { projectId: null, tagAll: ['x'] },
      { projectId: 'project-1', tagAll: ['x'] },
    ]);

    expect(scoped?.specificity).toBeGreaterThan(global?.specificity ?? 0);
  });

  test('keeps the row fields and does not mutate the input', () => {
    const input = [{ id: 'a', status: 'PENDING', tagAll: ['t'] }];
    const [rule] = attachRuleSpecificity(input);

    expect(rule).toMatchObject({ id: 'a', status: 'PENDING' });
    expect(input[0]).not.toHaveProperty('specificity');
  });
});
