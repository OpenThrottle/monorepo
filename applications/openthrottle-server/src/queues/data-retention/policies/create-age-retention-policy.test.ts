import { createMock } from '@golevelup/ts-vitest';
import type { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { createAgeRetentionPolicy } from './create-age-retention-policy';

describe('createAgeRetentionPolicy', () => {
  const options = {
    column: 'created_at',
    days: 180,
    name: 'test-policy',
    rationale: 'because',
    table: 'agent_token_usage',
  };

  const makeDataSource = (result: unknown): DataSource =>
    createMock<DataSource>({ query: vi.fn().mockResolvedValue(result) });

  it('counts expired rows without deleting anything', async () => {
    const dataSource = makeDataSource([{ count: '42' }]);

    const count =
      await createAgeRetentionPolicy(options).countExpired(dataSource);

    expect(count).toBe(42);
    const [sql] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    expect(sql).toContain('count(*)');
    expect(sql).not.toContain('DELETE');
  });

  it('reports zero rather than NaN when the count query returns nothing', async () => {
    const count = await createAgeRetentionPolicy(options).countExpired(
      makeDataSource([]),
    );

    expect(count).toBe(0);
  });

  it('bounds the delete by the requested batch limit', async () => {
    const dataSource = makeDataSource([{ id: 'a' }, { id: 'b' }]);

    const deleted = await createAgeRetentionPolicy(options).deleteBatch(
      dataSource,
      500,
    );

    expect(deleted).toBe(2);
    const [sql, params] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    expect(sql).toContain('DELETE FROM agent_token_usage');
    expect(sql).toContain('LIMIT $2');
    expect(params).toStrictEqual([180, 500]);
  });

  it('binds the retention window rather than interpolating it', async () => {
    const dataSource = makeDataSource([{ count: '0' }]);

    await createAgeRetentionPolicy(options).countExpired(dataSource);

    const [sql] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    expect(sql).toContain('make_interval(days => $1)');
    expect(sql).not.toContain('180');
  });

  // Identifiers cannot be bind parameters in Postgres, so the factory
  // interpolates them. The guard is what keeps that from ever being a hole.
  it.each([
    ['agent_token_usage; DROP TABLE users'],
    ['"quoted"'],
    ['UPPER'],
    ['with space'],
    [''],
    ['1_leading_digit'],
  ])('refuses %j as a table name', (table) => {
    expect(() => createAgeRetentionPolicy({ ...options, table })).toThrow(
      /Unsafe table name/,
    );
  });

  it('refuses an unsafe column name', () => {
    expect(() =>
      createAgeRetentionPolicy({ ...options, column: 'created_at, x' }),
    ).toThrow(/Unsafe column name/);
  });

  it('accepts plain snake_case identifiers', () => {
    expect(() =>
      createAgeRetentionPolicy({
        ...options,
        column: 'occurred_at',
        table: 'skill_usage_events',
      }),
    ).not.toThrow();
  });
});
