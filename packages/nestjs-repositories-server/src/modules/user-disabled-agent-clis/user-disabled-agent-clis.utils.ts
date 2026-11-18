import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { UserDisabledAgentCli } from './user-disabled-agent-cli.entity.ts';
import type { UserDisabledAgentClisRepositoryMock } from './user-disabled-agent-clis.types.ts';

/**
 * @description Builds a {@link UserDisabledAgentClisRepositoryMock} that starts as an empty
 * `user_disabled_agent_clis` table (see `createBaseRepositoryMock`): nothing is disabled, so
 * every agent and model reads as enabled, and the setters are no-ops. Provide it in place of
 * `UserDisabledAgentClisRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createUserDisabledAgentClisRepositoryMock(): UserDisabledAgentClisRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      UserDisabledAgentCli,
      CreateModelInput<UserDisabledAgentCli>
    >('user_disabled_agent_clis'),
    getDisabledBackends: vi.fn(async () => {
      return new Set<string>();
    }),
    getDisabledModels: vi.fn(async () => {
      return new Map<string, ReadonlySet<string>>();
    }),
    isEnabled: vi.fn(async () => {
      return true;
    }),
    isModelEnabled: vi.fn(async () => {
      return true;
    }),
    setEnabled: vi.fn(async () => {}),
    setModelEnabled: vi.fn(async () => {}),
    setModelsEnabled: vi.fn(async () => {}),
  };
}
