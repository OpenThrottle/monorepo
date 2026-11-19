import { createMock } from '@golevelup/ts-vitest';
import type { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

import { agentConversationsPolicy } from './agent-conversations.policy.ts';

const makeDataSource = (result: unknown): DataSource => {
  return createMock<DataSource>({ query: vi.fn().mockResolvedValue(result) });
};

describe('agentConversationsPolicy', () => {
  it('counts only soft-deleted conversations past the window, deleting nothing', async () => {
    const dataSource = makeDataSource([{ count: '7' }]);

    const count = await agentConversationsPolicy.countExpired(dataSource);

    expect(count).toBe(7);
    const [sql, params] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    expect(sql).toContain('deleted_at IS NOT NULL');
    expect(sql).toContain('deleted_at < now() - make_interval(days => $1)');
    expect(sql).not.toContain('DELETE');
    expect(params).toStrictEqual([30]);
  });

  it('reports zero when the count query returns nothing', async () => {
    const count = await agentConversationsPolicy.countExpired(
      makeDataSource([]),
    );

    expect(count).toBe(0);
  });

  it('deletes a bounded batch of expired conversations', async () => {
    const dataSource = makeDataSource([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

    const deleted = await agentConversationsPolicy.deleteBatch(
      dataSource,
      1000,
    );

    expect(deleted).toBe(3);
    const [sql, params] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    expect(sql).toContain('DELETE FROM agent_conversations');
    expect(sql).toContain('deleted_at IS NOT NULL');
    expect(sql).toContain('LIMIT $2');
    expect(params).toStrictEqual([30, 1000]);
  });
});
