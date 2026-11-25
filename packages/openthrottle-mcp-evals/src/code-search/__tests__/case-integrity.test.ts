import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CODE_SEARCH_CASES } from '../data/cases.ts';
import { CODE_SEARCH_GATE_CASE_ID } from '../data/dataset.ts';

const REPO_ROOT = resolve(import.meta.dirname, '../../../../..');

/**
 * @description Structural checks on the case data, offline and free. A gold path that no longer
 * exists would silently score every run as a miss, so this fails the ordinary test target instead.
 */
describe('CODE_SEARCH_CASES', () => {
  it('has unique ids and includes the gate case', () => {
    const ids = CODE_SEARCH_CASES.map((c) => c.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(CODE_SEARCH_GATE_CASE_ID);
  });

  it('gives every case a query and a gold set', () => {
    const empty = CODE_SEARCH_CASES.filter((c) => {
      return c.query.trim() === '' || c.relevantPaths.length === 0;
    });

    expect(empty.map((c) => c.id)).toEqual([]);
  });

  it('points every gold path at a file on the current tree', () => {
    const missing = CODE_SEARCH_CASES.flatMap((c) => {
      return c.relevantPaths.filter((path) => {
        return !existsSync(resolve(REPO_ROOT, path));
      });
    });

    expect(missing).toEqual([]);
  });
});
