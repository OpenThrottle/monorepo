import { describe, expect, it, vi } from 'vitest';

vi.mock('@openthrottle/react-router-graphql', () => {
  return {
    executeGraphqlWithAuth: vi.fn(async () => {
      return {
        allPlansCount: { totalCount: 3 },
        listDistinctAuthorsAndAssignees: ['ada'],
        listPlansByStatus: { items: [], totalCount: 2 },
        planCountsByStatus: [],
      };
    }),
  };
});

import { loadPlansIndex } from '../loadPlansIndex.server';

describe('loadPlansIndex', () => {
  it('maps the query results into the loader shape', async () => {
    const url = new URL('http://localhost/plans?page=1');
    const result = await loadPlansIndex(new Request(url), url);

    expect(result.assigneeOptions).toEqual(['ada']);
    expect(result.totalCount).toBe(2);
    expect(result.totalCountAll).toBe(3);
    expect(result.plans).toEqual([]);
  });
});
