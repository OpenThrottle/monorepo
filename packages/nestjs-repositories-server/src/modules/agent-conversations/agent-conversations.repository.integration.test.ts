import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getOpenThrottleTypeOrmOptions } from '../../data-source/data-source.utils.ts';
import { NestjsRepositoriesServerModule } from '../../nestjs-repositories-server.module.ts';
import { AgentConversationsRepository } from './agent-conversations.repository.ts';

/**
 * @description `AgentConversationsRepository` against a real, migrated openthrottle database: the
 * `updated_at` trigger from migration 193, which only Postgres can prove. Soft delete and restore
 * must leave `updated_at` alone (it orders the conversation list) while other writes still bump it.
 * Opt-in, like `nestjs-repositories-server.module.integration.test.ts`:
 *
 *   POSTGRES_HOST=localhost OT_OPENTHROTTLE_DB_INTEGRATION=true \
 *     pnpm nx run @openthrottle/nestjs-repositories-server:test --skip-nx-cache \
 *     -- src/modules/agent-conversations/agent-conversations.repository.integration.test.ts
 *
 * It writes rows, so point it at a worktree's own database (`pnpm worktree:db isolate`) rather than
 * a shared one. Every row it creates is hard deleted in `afterAll`.
 */

const ENABLED = process.env.OT_OPENTHROTTLE_DB_INTEGRATION === 'true';

describe.skipIf(!ENABLED)('AgentConversationsRepository (live DB)', () => {
  let app: TestingModule | undefined;
  let userId = '';
  const createdIds: string[] = [];

  const requireApp = (): TestingModule => {
    if (!app) {
      throw new Error('test module did not boot; see the beforeAll error');
    }
    return app;
  };

  const dataSource = (): DataSource => {
    return requireApp().get<DataSource>(getDataSourceToken());
  };

  const conversations = (): AgentConversationsRepository => {
    return requireApp().get(AgentConversationsRepository);
  };

  const createConversation = async (title: string): Promise<string> => {
    const conversation = await conversations().createConversation(userId, {
      title,
    });
    createdIds.push(conversation.id);
    return conversation.id;
  };

  /**
   * @description Reads `updated_at` as Postgres text, keeping the microseconds a JS `Date` drops.
   */
  const readUpdatedAt = async (id: string): Promise<string> => {
    const rows: unknown = await dataSource().query(
      `SELECT updated_at::text AS updated_at FROM agent_conversations WHERE id = $1`,
      [id],
    );
    const first: unknown = Array.isArray(rows) ? rows[0] : undefined;
    if (
      typeof first !== 'object' ||
      first === null ||
      !('updated_at' in first) ||
      typeof first.updated_at !== 'string'
    ) {
      throw new Error(`agent conversation ${id} not found`);
    }
    return first.updated_at;
  };

  const isUpdatedAfter = async (
    id: string,
    before: string,
  ): Promise<boolean> => {
    const rows: unknown = await dataSource().query(
      `SELECT updated_at > $2::timestamptz AS after FROM agent_conversations WHERE id = $1`,
      [id, before],
    );
    const first: unknown = Array.isArray(rows) ? rows[0] : undefined;
    return (
      typeof first === 'object' &&
      first !== null &&
      'after' in first &&
      first.after === true
    );
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
    userId = first.id;
  });

  afterAll(async () => {
    if (app && createdIds.length > 0) {
      await dataSource().query(
        `DELETE FROM agent_conversations WHERE id = ANY($1::uuid[])`,
        [createdIds],
      );
    }
    await app?.close();
  });

  describe('soft delete and restore', () => {
    it('leave updated_at unchanged across the round trip', async () => {
      const id = await createConversation('round trip');
      const original = await readUpdatedAt(id);

      await conversations().softDeleteConversation(userId, id);
      expect(await readUpdatedAt(id)).toBe(original);

      await conversations().restoreConversation(userId, id);
      expect(await readUpdatedAt(id)).toBe(original);
    });

    it('keep an older conversation behind a newer one after Undo', async () => {
      const older = await createConversation('older');
      const newer = await createConversation('newer');

      await conversations().softDeleteConversation(userId, older);
      await conversations().restoreConversation(userId, older);

      const listed = await conversations().listConversationsForUser(userId, {
        limit: 100,
      });
      const order = listed
        .map((conversation) => conversation.id)
        .filter((id) => id === older || id === newer);
      expect(order).toStrictEqual([newer, older]);
    });
  });

  describe('other writes', () => {
    it('bump updated_at on archive', async () => {
      const id = await createConversation('archive');
      const original = await readUpdatedAt(id);

      await conversations().archiveConversation(userId, id);

      expect(await isUpdatedAfter(id, original)).toBe(true);
    });

    it('bump updated_at on a title change', async () => {
      const id = await createConversation('title');
      const original = await readUpdatedAt(id);

      await conversations().updateConversationTitle(userId, id, 'renamed');

      expect(await isUpdatedAfter(id, original)).toBe(true);
    });
  });
});
