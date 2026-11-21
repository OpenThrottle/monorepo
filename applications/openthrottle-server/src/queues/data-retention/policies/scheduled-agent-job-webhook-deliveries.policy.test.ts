import { createMock } from '@golevelup/ts-vitest';
import type { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

import { scheduledAgentJobWebhookDeliveriesPolicy } from './scheduled-agent-job-webhook-deliveries.policy.ts';

const makeDataSource = (result: unknown): DataSource => {
  return createMock<DataSource>({ query: vi.fn().mockResolvedValue(result) });
};

describe('scheduledAgentJobWebhookDeliveriesPolicy', () => {
  it('targets the deliveries table on its 7-day window', async () => {
    const dataSource = makeDataSource([{ count: '3' }]);

    const count =
      await scheduledAgentJobWebhookDeliveriesPolicy.countExpired(dataSource);

    expect(count).toBe(3);
    expect(scheduledAgentJobWebhookDeliveriesPolicy.table).toBe(
      'scheduled_agent_job_webhook_deliveries',
    );
    const [sql, params] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    expect(sql).toContain('scheduled_agent_job_webhook_deliveries');
    expect(sql).toContain('created_at');
    expect(JSON.stringify(params)).toContain('7');
  });

  it('deletes a bounded batch', async () => {
    const dataSource = makeDataSource([{ id: 'a' }]);

    const deleted = await scheduledAgentJobWebhookDeliveriesPolicy.deleteBatch(
      dataSource,
      500,
    );

    expect(deleted).toBe(1);
    const [sql] = vi.mocked(dataSource.query).mock.calls[0] ?? [];
    expect(sql).toContain('DELETE');
  });
});
