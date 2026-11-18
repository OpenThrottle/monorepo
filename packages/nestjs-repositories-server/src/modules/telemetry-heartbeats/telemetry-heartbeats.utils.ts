import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { TelemetryHeartbeat } from './telemetry-heartbeat.entity.ts';
import type { TelemetryHeartbeatsRepositoryMock } from './telemetry-heartbeats.types.ts';

/**
 * @description Builds a {@link TelemetryHeartbeatsRepositoryMock} that starts as an empty
 * `telemetry_heartbeats` table (see `createBaseRepositoryMock`). `upsertHeartbeat` rejects
 * until a test stubs it, since an invented row would hide a missing stub. Provide it in
 * place of `TelemetryHeartbeatsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createTelemetryHeartbeatsRepositoryMock(): TelemetryHeartbeatsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      TelemetryHeartbeat,
      CreateModelInput<TelemetryHeartbeat>
    >('telemetry_heartbeats'),
    deleteForUserMachine: vi.fn(async () => {
      return 0;
    }),
    listForUser: vi.fn(async () => {
      return [];
    }),
    upsertHeartbeat: vi.fn(() => {
      return Promise.reject(
        new Error(
          'telemetry_heartbeats.upsertHeartbeat is not stubbed in this test',
        ),
      );
    }),
  };
}
