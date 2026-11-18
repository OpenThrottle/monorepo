import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { WorkSession } from './work-session.entity.ts';
import type { WorkSessionsRepositoryMock } from './work-sessions.types.ts';

/**
 * @description Builds a {@link WorkSessionsRepositoryMock} that starts as an empty
 * `work_sessions` table (see `createBaseRepositoryMock`): `close` finds no session and
 * resolves `null`. Provide it in place of `WorkSessionsRepository` and stub per test.
 * Test-only: imports `vitest`.
 * @public
 */
export function createWorkSessionsRepositoryMock(): WorkSessionsRepositoryMock {
  return {
    ...createBaseRepositoryMock<WorkSession, CreateModelInput<WorkSession>>(
      'work_sessions',
    ),
    close: vi.fn(async () => {
      return null;
    }),
  };
}
