/**
 * @description Tests that activityByDateRange bounds every leg in SQL rather than
 * materialising a whole date range and slicing it in JS, and that totalCount /
 * hasNext stay honest once the legs are capped.
 */

import { createMock } from '@golevelup/ts-vitest';
import { PlansService } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityByDateRangeInput } from './activity.input';
import { ActivityResolver } from './activity.resolver';

type QueryFn = (sql: string, params?: unknown[]) => Promise<unknown[]>;

/** Mirrors the resolver's own default; asserted rather than imported so a change is visible here. */
const DEFAULT_LIMIT = 500;

describe('ActivityResolver.activityByDateRange row bounds', () => {
  let query: ReturnType<typeof vi.fn<QueryFn>>;
  let resolver: ActivityResolver;

  /** Every leg returns no rows; the count leg returns `total`. */
  const respondWith = (total: number): void => {
    query.mockImplementation((sql) =>
      Promise.resolve(
        sql.includes('AS total') ? [{ total: String(total) }] : [],
      ),
    );
  };

  /** SQL issued for the three row legs, in call order (the count leg excluded). */
  const rowLegCalls = (): Array<{ params: unknown[]; sql: string }> =>
    query.mock.calls
      .map(([sql, params]) => ({ params: params ?? [], sql }))
      .filter((call) => !call.sql.includes('AS total'));

  beforeEach(() => {
    query = vi.fn();
    const plansService = createMock<PlansService>({
      getRepository: vi.fn().mockReturnValue({ manager: { query } }),
    });
    resolver = new ActivityResolver(plansService);
  });

  const run = (limit?: number, offset?: number) => {
    const input: ActivityByDateRangeInput = {
      endIso: '2027-01-01T00:00:00Z',
      limit: limit ?? null,
      offset: offset ?? null,
      startIso: '2026-01-01T00:00:00Z',
    };

    return resolver.activityByDateRange(input);
  };

  it('applies a LIMIT to all three row legs', async () => {
    respondWith(0);

    await run();

    const legs = rowLegCalls();
    expect(legs).toHaveLength(3);
    for (const leg of legs) expect(leg.sql).toMatch(/LIMIT \$3/);
  });

  it('bounds an unpaginated request instead of reading the whole range', async () => {
    respondWith(10_000);

    await run();

    for (const leg of rowLegCalls()) {
      expect(leg.params[2]).toBe(DEFAULT_LIMIT);
    }
  });

  it('reads only offset+limit rows per leg when paginating', async () => {
    respondWith(10_000);

    await run(50, 100);

    for (const leg of rowLegCalls()) expect(leg.params[2]).toBe(150);
  });

  it('caps fetch depth so a pathological offset cannot become an unbounded scan', async () => {
    respondWith(10_000_000);

    await run(500, 1_000_000);

    for (const leg of rowLegCalls()) expect(leg.params[2]).toBe(2_000);
  });

  it('orders every leg newest-first so the LIMIT keeps the right rows', async () => {
    respondWith(0);

    await run();

    for (const leg of rowLegCalls()) expect(leg.sql).toMatch(/DESC\s+LIMIT/);
  });

  it('reports totalCount from the count leg, not from the rows read', async () => {
    respondWith(9_365);

    const result = await run();

    expect(result.totalCount).toBe(9_365);
  });

  it('counts each leg with the same plans join the fetch uses', async () => {
    respondWith(0);

    await run();

    const countSql = query.mock.calls
      .map(([sql]) => sql)
      .find((sql) => sql.includes('AS total'));

    // Rows whose parent plan is missing are dropped by the fetch, so counting
    // without the join would report a total the rows can never reach.
    expect(countSql?.match(/JOIN plans/g)).toHaveLength(3);
  });

  it('reports hasNext when the range holds more than was returned', async () => {
    respondWith(10_000);

    const result = await run();

    expect(result.hasNext).toBe(true);
  });

  it('does not report hasNext when everything in range was returned', async () => {
    respondWith(0);

    const result = await run();

    expect(result.hasNext).toBe(false);
  });
});
