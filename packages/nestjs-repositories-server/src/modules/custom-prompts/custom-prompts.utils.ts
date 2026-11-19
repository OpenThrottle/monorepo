import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { CustomPrompt } from './custom-prompt.entity.ts';
import type { CustomPromptsRepositoryMock } from './custom-prompts.types.ts';

/**
 * @description Builds a {@link CustomPromptsRepositoryMock} that starts as an empty
 * `custom_prompts` table (see `createBaseRepositoryMock`): nothing is listed or found and the
 * delete and restore helpers report nothing matched. Provide it in place of
 * `CustomPromptsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createCustomPromptsRepositoryMock(): CustomPromptsRepositoryMock {
  return {
    ...createBaseRepositoryMock<CustomPrompt, CreateModelInput<CustomPrompt>>(
      'custom_prompts',
    ),
    findIncludingDeleted: vi.fn(async () => {
      return null;
    }),
    hardDeleteById: vi.fn(async () => {
      return false;
    }),
    listFiltered: vi.fn(async () => {
      return [];
    }),
    restoreById: vi.fn(async () => {
      return null;
    }),
    softDeleteById: vi.fn(async () => {
      return false;
    }),
  };
}
