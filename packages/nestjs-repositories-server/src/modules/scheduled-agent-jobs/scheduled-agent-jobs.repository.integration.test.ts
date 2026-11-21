import { randomBytes } from 'node:crypto';

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getOpenThrottleTypeOrmOptions } from '../../data-source/data-source.utils.ts';
import { NestjsRepositoriesServerModule } from '../../nestjs-repositories-server.module.ts';
import { ScheduledAgentJobWebhookTriggersRepository } from '../scheduled-agent-job-webhook-triggers/scheduled-agent-job-webhook-triggers.repository.ts';
import { ScheduledAgentJobsRepository } from './scheduled-agent-jobs.repository.ts';

/**
 * @description `ScheduledAgentJobsRepository` against a real, migrated openthrottle database: the
 * behaviour that only Postgres can prove (transactions, foreign keys). Opt-in, like
 * `nestjs-repositories-server.module.integration.test.ts`, whose header has the run command:
 *
 *   POSTGRES_HOST=localhost OT_OPENTHROTTLE_DB_INTEGRATION=true \
 *     pnpm nx run @openthrottle/nestjs-repositories-server:test --skip-nx-cache \
 *     -- src/modules/scheduled-agent-jobs/scheduled-agent-jobs.repository.integration.test.ts
 *
 * It writes rows, so point it at a worktree's own database (`pnpm worktree:db isolate`) rather than
 * a shared one. Every row it creates is hard deleted in `afterAll`.
 */

const ENABLED = process.env.OT_OPENTHROTTLE_DB_INTEGRATION === 'true';

/** Concurrent creates per race test: enough that an unlocked count-then-insert reliably overshoots. */
const RACERS = ['a', 'b', 'c', 'd', 'e', 'f'];

describe.skipIf(!ENABLED)('ScheduledAgentJobsRepository (live DB)', () => {
  let app: TestingModule | undefined;
  let ownerUserId = '';
  const createdJobIds: string[] = [];

  const requireApp = (): TestingModule => {
    if (!app) {
      throw new Error('test module did not boot; see the beforeAll error');
    }
    return app;
  };

  const dataSource = (): DataSource => {
    return requireApp().get<DataSource>(getDataSourceToken());
  };

  const jobs = (): ScheduledAgentJobsRepository => {
    return requireApp().get(ScheduledAgentJobsRepository);
  };

  const createJob = async (name: string): Promise<string> => {
    const job = await jobs().createJob({
      cronPattern: '0 3 * * *',
      driverId: 'claude',
      name,
      ownerUserId,
      prompt: 'integration test',
    });
    createdJobIds.push(job.id);
    return job.id;
  };

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(getOpenThrottleTypeOrmOptions()),
        NestjsRepositoriesServerModule,
      ],
    }).compile();

    const rows: unknown = await dataSource().query(
      `SELECT id FROM users WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1`,
    );
    const first: unknown = Array.isArray(rows) ? rows[0] : undefined;
    if (
      typeof first !== 'object' ||
      first === null ||
      !('id' in first) ||
      typeof first.id !== 'string'
    ) {
      throw new Error('the integration database has no user; seed it first');
    }
    ownerUserId = first.id;
  });

  afterAll(async () => {
    if (app && createdJobIds.length > 0) {
      await dataSource().query(
        `DELETE FROM scheduled_agent_jobs WHERE id = ANY($1::uuid[])`,
        [createdJobIds],
      );
    }
    await app?.close();
  });

  describe('createJobWithinOwnerCaps', () => {
    it('lets exactly one of several simultaneous creates at cap - 1 through', async () => {
      const existing = await jobs().countJobsForOwner(ownerUserId);
      const caps = { maxMcpPerOwner: 1000, maxPerOwner: existing + 1 };

      const attempt = (name: string) => {
        return jobs().createJobWithinOwnerCaps(
          {
            cronPattern: '0 3 * * *',
            driverId: 'claude',
            name,
            ownerUserId,
            prompt: 'integration test',
          },
          caps,
        );
      };

      const results = await Promise.all(
        RACERS.map((racer) => {
          return attempt(`race-${racer}`);
        }),
      );
      for (const result of results) {
        if (result.ok) {
          createdJobIds.push(result.job.id);
        }
      }

      const accepted = results.filter((result) => {
        return result.ok;
      });
      const refused = results.filter((result) => {
        return !result.ok;
      });
      expect(accepted).toHaveLength(1);
      expect(refused).toHaveLength(RACERS.length - 1);
      for (const result of refused) {
        expect(result).toStrictEqual({
          count: existing + 1,
          limit: existing + 1,
          ok: false,
          scope: 'all',
        });
      }
      await expect(jobs().countJobsForOwner(ownerUserId)).resolves.toBe(
        existing + 1,
      );
    });

    it('applies the agent-created cap under the same lock', async () => {
      const existingMcp = await jobs().countJobsForOwner(ownerUserId, 'mcp');
      const caps = { maxMcpPerOwner: existingMcp + 1, maxPerOwner: 100_000 };

      const attempt = (name: string) => {
        return jobs().createJobWithinOwnerCaps(
          {
            createdVia: 'mcp',
            cronPattern: '0 3 * * *',
            driverId: 'claude',
            idempotencyKey: name,
            name,
            ownerUserId,
            prompt: 'integration test',
          },
          caps,
        );
      };

      const results = await Promise.all(
        RACERS.map((racer) => {
          return attempt(`race-mcp-${racer}`);
        }),
      );
      for (const result of results) {
        if (result.ok) {
          createdJobIds.push(result.job.id);
        }
      }

      const outcomes = results.map((result) => {
        return result.ok ? 'ok' : result.scope;
      });
      expect(outcomes.filter((outcome) => outcome === 'ok')).toHaveLength(1);
      expect(outcomes.filter((outcome) => outcome === 'mcp')).toHaveLength(
        RACERS.length - 1,
      );
    });
  });

  describe('deleteJob', () => {
    it('removes the job’s webhook trigger, secret and token hash with it', async () => {
      const jobId = await createJob('delete-removes-trigger');
      const triggers = requireApp().get(
        ScheduledAgentJobWebhookTriggersRepository,
      );
      const tokenHash = randomBytes(32);
      await triggers.createTrigger({
        coalesceWindowMs: 0,
        deliveryIdHeader: null,
        enabled: true,
        filters: [],
        maxInFlight: 1,
        rateLimitPerMinute: 10,
        scheduledAgentJobId: jobId,
        secretCiphertext: randomBytes(48),
        signatureEncoding: 'hex',
        signatureHeader: 'X-OT-Signature',
        signaturePreset: 'generic',
        timestampHeader: 'X-OT-Timestamp',
        timestampToleranceSeconds: 300,
        tokenHash,
        tokenPrefix: 'abcdef',
      });

      await expect(jobs().deleteJob(jobId)).resolves.toBe(true);

      await expect(triggers.findTriggerByJobId(jobId)).resolves.toBeNull();
      await expect(
        triggers.findTriggerByTokenHash(tokenHash),
      ).resolves.toBeNull();
      await expect(jobs().findJobById(jobId)).resolves.toBeNull();
    });

    it('reports false for an already deleted job', async () => {
      const jobId = await createJob('delete-twice');

      await expect(jobs().deleteJob(jobId)).resolves.toBe(true);
      await expect(jobs().deleteJob(jobId)).resolves.toBe(false);
    });
  });
});
