import { describe, expect, it } from 'vitest';

import { SEARCH_RANKING_CASES } from '../data/cases.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * @description Structural checks on the case data — offline and free, so they run in the ordinary test target.
 * Whether a gold id still exists in a given knowledge base is only knowable live; the CLI reports that.
 */
describe('SEARCH_RANKING_CASES', () => {
  it('has unique ids', () => {
    const ids = SEARCH_RANKING_CASES.map((c) => c.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has at least 30 cases with both query kinds and both splits', () => {
    const kinds = new Set(SEARCH_RANKING_CASES.map((c) => c.kind));
    const splits = new Set(SEARCH_RANKING_CASES.map((c) => c.split));

    expect(SEARCH_RANKING_CASES.length).toBeGreaterThanOrEqual(30);
    expect([...kinds].sort()).toEqual(['identifier', 'topic']);
    expect([...splits].sort()).toEqual(['dev', 'test']);
  });

  it('gives every case a non-empty query and gold set', () => {
    const empty = SEARCH_RANKING_CASES.filter((c) => {
      return c.query.trim() === '' || c.relevant.length === 0;
    });

    expect(empty.map((c) => c.id)).toEqual([]);
  });

  it('uses well-formed plan and task ids', () => {
    const malformed = SEARCH_RANKING_CASES.flatMap((c) => {
      return c.relevant.flatMap((target) => {
        if (target.kind === 'plan') {
          return UUID.test(target.planId) ? [] : [`${c.id}: ${target.planId}`];
        }

        if (target.kind === 'task') {
          return UUID.test(target.taskId) ? [] : [`${c.id}: ${target.taskId}`];
        }

        return [];
      });
    });

    expect(malformed).toEqual([]);
  });

  it('never lists the same target twice in one case', () => {
    const duplicated = SEARCH_RANKING_CASES.filter((c) => {
      const keys = c.relevant.map((target) => JSON.stringify(target));

      return new Set(keys).size !== keys.length;
    });

    expect(duplicated.map((c) => c.id)).toEqual([]);
  });
});
